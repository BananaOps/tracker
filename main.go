package main

import (
	"fmt"
	"log"
	"net"

	event "github.com/bananaops/events-tracker/generated/proto/event/v1alpha1"
	"github.com/bananaops/events-tracker/server"

	"google.golang.org/grpc"
	"google.golang.org/grpc/reflection"
)

func main() {

	// create new gRPC server
	s := grpc.NewServer()

	// create new instance of Translation server
	events := server.NewEvent()

	// register reflection API https://github.com/grpc/grpc/blob/master/doc/server-reflection.md
	reflection.Register(s)

	// register it to the grpc server
	event.RegisterEventServiceServer(s, events)

	// create socket to listen to requests
	tl, err := net.Listen("tcp", "localhost:8765")
	if err != nil {
		log.Fatal(fmt.Println("Error starting tcp listener on port 8765", err))
	}

	// start listening
	s.Serve(tl)
}
