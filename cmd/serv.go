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
	"syscall"
	"time"

	catalog "github.com/bananaops/tracker/generated/proto/catalog/v1alpha1"
	event "github.com/bananaops/tracker/generated/proto/event/v1alpha1"
	lock "github.com/bananaops/tracker/generated/proto/lock/v1alpha1"
	"github.com/bananaops/tracker/server"
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

		//define logger for http server error
		handler := slog.NewJSONHandler(os.Stdout, nil)
		httplogger := slog.NewLogLogger(handler, slog.LevelError)

		httpServer := &http.Server{
			Addr:              "0.0.0.0:8080",
			ReadHeaderTimeout: 2 * time.Second, // Fix CWE-400 Potential Slowloris Attack because ReadHeaderTimeout is not configured in the http.Server
			Handler:           mux,
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
			if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
				log.Fatal(fmt.Printf("Failed to serve HTTP server: %v\n", err))
				os.Exit(1)
			}
		}()

		go func() {
			// Exposer les métriques via HTTP
			slog.Info("HTTP  metrics server listening on :8081")
			http.Handle("/metrics", promhttp.Handler())
			log.Fatal(http.ListenAndServe(":8081", nil))
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
