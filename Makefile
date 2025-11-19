# Setting SHELL to bash allows bash commands to be executed by recipes.
# Options are set to exit when a recipe line exits non-zero or a piped command fails.
SHELL = /usr/bin/env bash -o pipefail
.SHELLFLAGS = -ec

.PHONY: all
all: build

##@ General

# The help target prints out all targets with their descriptions organized
# beneath their categories. The categories are represented by '##@' and the
# target descriptions by '##'. The awk commands is responsible for reading the
# entire set of makefiles included in this invocation, looking for lines of the
# file as xyz: ## something, and then pretty-format the target and help. Then,
# if there's a line with ##@ something, that gets pretty-printed as a category.
# More info on the usage of ANSI control characters for terminal formatting:
# https://en.wikipedia.org/wiki/ANSI_escape_code#SGR_parameters
# More info on the awk command:
# http://linuxcommand.org/lc3_adv_awk.php

.PHONY: help
help: ## Display this help.
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make \033[36m<target>\033[0m\n"} /^[a-zA-Z_0-9-]+:.*?##/ { printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2 } /^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) } ' $(MAKEFILE_LIST)

##@ Development


.PHONY: generate
generate: ## Generate protobuf files
	buf mod update
	buf generate


.PHONY: fmt
fmt: ## Format protobuf, go files
	buf format
	go fmt ./...


.PHONY: lint
lint: ## lint protobuf, go files
	buf lint

.PHONY: run
run: ## skaffold run to deploy app on k8s
	skaffold run

.PHONY: dev
dev: ## skaffold dev for local development with hot-reload
	skaffold dev -f skaffold.dev.yaml

.PHONY: deploy
deploy: ## Deploy to kubernetes with skaffold
	skaffold deploy

.PHONY: delete
delete: ## Delete deployment from kubernetes
	skaffold delete

##@ Docker

.PHONY: docker-build
docker-build: ## Build Docker image with frontend and backend
	docker build -t bananaops/tracker:latest .

.PHONY: docker-run
docker-run: ## Run Docker container locally
	docker run -p 8080:8080 -p 8081:8081 -p 8765:8765 bananaops/tracker:latest

.PHONY: docker-build-run
docker-build-run: docker-build docker-run ## Build and run Docker container

.PHONY: docker-compose-up
docker-compose-up: ## Start application with docker-compose
	docker-compose up -d

.PHONY: docker-compose-down
docker-compose-down: ## Stop application with docker-compose
	docker-compose down

.PHONY: docker-compose-logs
docker-compose-logs: ## Show logs from docker-compose
	docker-compose logs -f
