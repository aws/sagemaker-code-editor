.PHONY: build-cache build install-act run-github run-local clean

build-cache:
	@echo "Building SageMaker Code Editor (multi-stage npm cache)..."
	docker buildx build \
		--progress=plain \
		--memory=32g \
		-t npm-cache:latest \
		-f scripts/Dockerfile.build.cache .

build:
	@echo "Building SageMaker Code Editor (original)..."
	docker buildx build \
		--progress=plain \
		--memory=32g \
		--output type=local,dest=./artifacts \
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
		echo "Usage: make run-local TARBALL=<tarball-name>"; \
		echo "Example: make run-local TARBALL=sagemaker-code-editor-1.101.2.tar.gz"; \
		exit 1; \
	fi
	@echo "Building and running SageMaker Code Editor locally on port 8888..."
	docker build -f scripts/Dockerfile.run --build-arg TARBALL=$(TARBALL) -t local-code-editor .
	docker stop local-code-editor 2>/dev/null || true
	@echo "Starting container on http://localhost:8888"
	docker run --rm -d -p 8888:8000 --name local-code-editor local-code-editor
	docker logs -f local-code-editor

clean:
	@echo "Cleaning build artifacts..."
	rm -f artifacts
	@echo "Clean build artifacts completed"
	@echo "Cleaning act temporary files and Docker images..."
	@echo "Removing act cache..."
	@rm -rf ~/.cache/act 2>/dev/null || true
	@echo "Act cleanup completed"

