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
	"time"

	event "github.com/bananaops/tracker/generated/proto/event/v1alpha1"
	"github.com/bananaops/tracker/server"
	"github.com/grpc-ecosystem/grpc-gateway/v2/runtime"

	"github.com/spf13/cobra"
	"google.golang.org/grpc"
	"google.golang.org/grpc/reflection"
)

var serv = &cobra.Command{
	Use:   "serv",
	Short: "Run tracker server",
	Run: func(cmd *cobra.Command, args []string) {

		// create new gRPC server
		grpcServer := grpc.NewServer()

		// create new instance of Translation server
		events := server.NewEvent()

		// register reflection API https://github.com/grpc/grpc/blob/master/doc/server-reflection.md
		reflection.Register(grpcServer)

		// register it to the grpc server
		event.RegisterEventServiceServer(grpcServer, events)

		// create socket to listen to requests
		tl, err := net.Listen("tcp", "localhost:8765")
		if err != nil {
			log.Fatal(fmt.Println("error starting tcp listener on port 8765", err))
		}

		// start listening
		go grpcServer.Serve(tl)
		slog.Info("starting tcp listener on port 8765")

		ctx := context.TODO()
		mux := runtime.NewServeMux()

		// Register generated routes to mux
		err = event.RegisterEventServiceHandlerServer(ctx, mux, events)
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

		slog.Info("starting http listener on port 8080")
		err = httpServer.ListenAndServe()
		if err != nil {
			log.Fatal(fmt.Println("error starting http listener on port 8080", err))
		}

	},
}

func init() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	slog.SetDefault(logger)
	rootCmd.AddCommand(serv)

}
