//nolint:errcheck
package cmd

import (
	"context"
	"fmt"
	"log"
	"log/slog"
	"net"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"strings"
	"syscall"
	"time"

	catalog "github.com/bananaops/tracker/generated/proto/catalog/v1alpha1"
	event "github.com/bananaops/tracker/generated/proto/event/v1alpha1"
	lock "github.com/bananaops/tracker/generated/proto/lock/v1alpha1"
	"github.com/bananaops/tracker/server"
	"github.com/go-openapi/runtime/middleware"
	"github.com/grpc-ecosystem/grpc-gateway/v2/runtime"
	"github.com/prometheus/client_golang/prometheus/promhttp"

	"github.com/spf13/cobra"
	"google.golang.org/grpc"
	"google.golang.org/grpc/reflection"
)

var serv = &cobra.Command{
	Use:   "serv",
	Short: "Run tracker server",
	Run: func(cmd *cobra.Command, args []string) {

		// Set up gRPC server
		grpcServerEndpoint := "localhost:8765"
		grpcServer := grpc.NewServer()

		// register reflection API https://github.com/grpc/grpc/blob/master/doc/server-reflection.md
		reflection.Register(grpcServer)

		// register event service
		events := server.NewEvent()
		event.RegisterEventServiceServer(grpcServer, events)

		// register lock service
		locks := server.NewLock()
		lock.RegisterLockServiceServer(grpcServer, locks)

		// register catalog service
		catalogs := server.NewCatalog()
		catalog.RegisterCatalogServiceServer(grpcServer, catalogs)

		// register health checK service
		//healthCheckService := &server.HealthCheckService{}
		//health.RegisterHealthServer(grpcServer, healthCheckService)

		ctx := context.TODO()
		mux := runtime.NewServeMux()

		// Register generated routes to mux
		err := event.RegisterEventServiceHandlerServer(ctx, mux, events)
		if err != nil {
			panic(err)
		}

		err = lock.RegisterLockServiceHandlerServer(ctx, mux, locks)
		if err != nil {
			panic(err)
		}

		err = catalog.RegisterCatalogServiceHandlerServer(ctx, mux, catalogs)
		if err != nil {
			panic(err)
		}

		// Setup Swagger documentation with go-swagger
		opts := middleware.SwaggerUIOpts{SpecURL: "/swagger.json"}
		sh := middleware.SwaggerUI(opts, nil)

		// Serve swagger.json
		mux.HandlePath("GET", "/swagger.json", func(w http.ResponseWriter, r *http.Request, pathParams map[string]string) {
			http.ServeFile(w, r, "generated/openapiv2/apidocs.swagger.json")
		})

		// Serve Swagger UI
		mux.HandlePath("GET", "/docs", func(w http.ResponseWriter, r *http.Request, pathParams map[string]string) {
			sh.ServeHTTP(w, r)
		})

		//define logger for http server error
		handler := slog.NewJSONHandler(os.Stdout, nil)
		httplogger := slog.NewLogLogger(handler, slog.LevelError)

		// Determine HTTP handler based on frontend availability
		var httpHandler http.Handler
		frontendDir := "web/dist"
		if _, err := os.Stat(frontendDir); err == nil {
			slog.Info("Serving frontend from", "path", frontendDir)

			// Create a file server for static assets
			fileServer := http.FileServer(http.Dir(frontendDir))

			// Custom handler to serve index.html for SPA routes
			httpHandler = http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				// Check if path starts with /api/ - if so, let the API handler deal with it
				if strings.HasPrefix(r.URL.Path, "/api/") ||
					strings.HasPrefix(r.URL.Path, "/swagger.json") ||
					strings.HasPrefix(r.URL.Path, "/docs") {
					mux.ServeHTTP(w, r)
					return
				}

				// Get the absolute path to prevent directory traversal
				path := filepath.Join(frontendDir, r.URL.Path)

				// Check if file exists
				_, err := os.Stat(path)
				if os.IsNotExist(err) {
					// File does not exist, serve index.html for SPA routing
					http.ServeFile(w, r, filepath.Join(frontendDir, "index.html"))
					return
				} else if err != nil {
					// Other error, return 500
					http.Error(w, err.Error(), http.StatusInternalServerError)
					return
				}

				// File exists, serve it
				fileServer.ServeHTTP(w, r)
			})
		} else {
			slog.Warn("Frontend directory not found, serving API only", "path", frontendDir)
			httpHandler = mux
		}

		httpServer := &http.Server{
			Addr:              "0.0.0.0:8080",
			ReadHeaderTimeout: 2 * time.Second, // Fix CWE-400 Potential Slowloris Attack because ReadHeaderTimeout is not configured in the http.Server
			Handler:           httpHandler,
			ErrorLog:          httplogger,
		}

		// Create a new mux for metrics
		muxMetrics := http.NewServeMux()

		// Add a handler for the /metrics endpoint
		muxMetrics.Handle("/metrics", promhttp.Handler())

		metricsServer := &http.Server{
			Addr:              "0.0.0.0:8081",
			ReadHeaderTimeout: 2 * time.Second, // Fix CWE-400 Potential Slowloris Attack because ReadHeaderTimeout is not configured in the http.Server
			Handler:           muxMetrics,
			ErrorLog:          httplogger,
		}

		// Start gRPC server in a separate goroutine
		go func() {
			// create socket to listen to requests
			listener, err := net.Listen("tcp", grpcServerEndpoint)
			if err != nil {
				log.Fatal(fmt.Println("error starting tcp listener on port 8765", err))
				os.Exit(1)
			}

			slog.Info("gRPC server listening on :8765")
			// start listening
			if err := grpcServer.Serve(listener); err != nil {
				log.Fatal(fmt.Printf("Failed to serve gRPC server: %v\n", err))
				os.Exit(1)
			}

		}()

		// Start HTTP server in a separate goroutine
		go func() {
			slog.Info("HTTP server listening on :8080")
			slog.Info("Swagger UI available at http://localhost:8080/docs")
			slog.Info("Swagger JSON available at http://localhost:8080/swagger.json")
			if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
				log.Fatal(fmt.Printf("Failed to serve HTTP server: %v\n", err))
				os.Exit(1)
			}
		}()

		go func() {
			// Exposer prometheus metrics
			slog.Info("metrics server listening on :8081")
			if err := metricsServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
				log.Fatal(fmt.Printf("Failed to serve metrics server: %v\n", err))
				os.Exit(1)
			}
		}()

		// Handle graceful shutdown
		stop := make(chan os.Signal, 1)
		signal.Notify(stop, os.Interrupt, syscall.SIGINT, syscall.SIGTERM)
		<-stop

		slog.Info("shutting down servers...")

		// Gracefully stop gRPC server
		grpcServer.GracefulStop()

		// Gracefully stop HTTP server
		if err := httpServer.Shutdown(context.Background()); err != nil {
			log.Fatal(fmt.Printf("Failed to shutdown HTTP server: %v\n", err))
		}

		slog.Info("servers stopped")

	},
}

func init() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	slog.SetDefault(logger)
	rootCmd.AddCommand(serv)

}
