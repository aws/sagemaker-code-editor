.PHONY: build-cache build install-act run-github run-local clean

build-cache:
	@echo "Building SageMaker Code Editor (multi-stage npm cache)..."
	docker buildx build \
		--platform linux/amd64 \
		--progress=plain \
		--memory=32g \
		-t npm-cache:latest \
		-f scripts/Dockerfile.build.cache .

build:
	@echo "Building SageMaker Code Editor (original)..."
	docker buildx build \
		--platform linux/amd64 \
		--progress=plain \
		--memory=32g \
		--output type=local,dest=./.artifacts \
		-t localbuild:latest \
		-f scripts/Dockerfile.build .

install-act:
	@echo "Installing act (GitHub Actions runner)..."
	@if ! command -v act >/dev/null 2>&1 && [ ! -f ./bin/act ]; then \
		curl -s https://raw.githubusercontent.com/nektos/act/master/install.sh | bash; \
		echo "act installed successfully"; \
	else \
		echo "act is already available"; \
	fi

run-github: install-act
	@echo "Running complete GitHub Actions workflow locally..."
	@echo "Available workflows:"
	@ls -la .github/workflows/
	@echo ""
	@echo "Running full build.yml workflow..."
	@if command -v act >/dev/null 2>&1; then \
		act push -W .github/workflows/build.yml --platform ubuntu-22.04=catthehacker/ubuntu:act-22.04 --container-options "--memory=32g --memory-swap=32g"; \
	else \
		./bin/act push -W .github/workflows/build.yml --platform ubuntu-22.04=catthehacker/ubuntu:act-22.04 --container-options "--memory=32g --memory-swap=32g"; \
	fi

run-local:
	@if [ -z "$(TARBALL)" ]; then \
		echo "Building and running SageMaker Code Editor locally on port 8888..."; \
		docker build -f scripts/Dockerfile.dev -t local-code-editor-dev . || exit 1; \
		echo "Stopping container..."; \
		docker stop local-code-editor-dev; \
		sleep 2; \
		echo "Starting container on http://localhost:8888"; \
		docker run --rm -d -p 8888:8000 -v .:/workspace --entrypoint /workspace/scripts/run-code-editor-dev.sh --name local-code-editor-dev local-code-editor-dev || exit 1; \
		docker logs -f local-code-editor-dev; \
	else \
		echo "Building and running SageMaker Code Editor locally on port 8888..."; \
		docker build -f scripts/Dockerfile.run --build-arg TARBALL=$(TARBALL) -t local-code-editor . || exit 1; \
		echo "Stopping container..."; \
		docker stop local-code-editor; \
		sleep 2; \
		echo "Starting container on http://localhost:8888"; \
		docker run --rm -d -p 8888:8000 --name local-code-editor local-code-editor || exit 1; \
		docker logs -f local-code-editor; \
	fi

clean-vscode:
	@echo "Cleaning VSCode node_modules..."
	@find . -type d -name "node_modules" -exec rm -rf {} + 2>/dev/null || true
	@rm -rf vscode/out/* 2>/dev/null || true
	@echo "VSCode cleanup completed"

clean:
	@echo "Cleaning act temporary files and Docker images..."
	@echo "Removing act cache..."
	@rm -rf ~/.cache/act 2>/dev/null || true
	@echo "Act cleanup completed"

