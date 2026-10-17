BIN_DIR ?= bin
TAURI_CLI ?= pnpm tauri

TARGET_WIN_AMD64 = x86_64-pc-windows-msvc
TARGET_WIN_ARM64 = aarch64-pc-windows-msvc

TARGET_LINUX_AMD64 = x86_64-unknown-linux-gnu
TARGET_LINUX_ARM64 = aarch64-unknown-linux-gnu

TARGET_MACOS_AMD64 = x86_64-apple-darwin
TARGET_MACOS_ARM64 = aarch64-apple-darwin

.PHONY: all build build-windows build-windows-amd64 build-windows-arm64 build-linux build-linux-amd64 build-linux-arm64 build-macos build-macos-amd64 build-macos-arm64 build-darwin build-darwin-amd64 build-darwin-arm64 build-all clean

all: build

$(BIN_DIR):
	mkdir -p $(BIN_DIR)

build: | $(BIN_DIR)
	$(TAURI_CLI) build
	@if [ -d "src-tauri/target/release/bundle" ]; then \
		cp -r src-tauri/target/release/bundle/* $(BIN_DIR)/ 2>/dev/null || true; \
	fi
	@if [ -f "src-tauri/target/release/sylix-scope" ]; then \
		cp src-tauri/target/release/sylix-scope $(BIN_DIR)/ 2>/dev/null || true; \
	fi
	@if [ -f "src-tauri/target/release/sylix-scope.exe" ]; then \
		cp src-tauri/target/release/sylix-scope.exe $(BIN_DIR)/ 2>/dev/null || true; \
	fi

build-windows-amd64: | $(BIN_DIR)
	$(TAURI_CLI) build --target $(TARGET_WIN_AMD64)
	@if [ -d "src-tauri/target/$(TARGET_WIN_AMD64)/release/bundle" ]; then \
		mkdir -p $(BIN_DIR)/windows-amd64 && cp -r src-tauri/target/$(TARGET_WIN_AMD64)/release/bundle/* $(BIN_DIR)/windows-amd64/ 2>/dev/null || true; \
	fi

build-windows-arm64: | $(BIN_DIR)
	$(TAURI_CLI) build --target $(TARGET_WIN_ARM64)
	@if [ -d "src-tauri/target/$(TARGET_WIN_ARM64)/release/bundle" ]; then \
		mkdir -p $(BIN_DIR)/windows-arm64 && cp -r src-tauri/target/$(TARGET_WIN_ARM64)/release/bundle/* $(BIN_DIR)/windows-arm64/ 2>/dev/null || true; \
	fi

build-windows: build-windows-amd64 build-windows-arm64

build-linux-amd64: | $(BIN_DIR)
	$(TAURI_CLI) build --target $(TARGET_LINUX_AMD64)
	@if [ -d "src-tauri/target/$(TARGET_LINUX_AMD64)/release/bundle" ]; then \
		mkdir -p $(BIN_DIR)/linux-amd64 && cp -r src-tauri/target/$(TARGET_LINUX_AMD64)/release/bundle/* $(BIN_DIR)/linux-amd64/ 2>/dev/null || true; \
	fi

build-linux-arm64: | $(BIN_DIR)
	$(TAURI_CLI) build --target $(TARGET_LINUX_ARM64)
	@if [ -d "src-tauri/target/$(TARGET_LINUX_ARM64)/release/bundle" ]; then \
		mkdir -p $(BIN_DIR)/linux-arm64 && cp -r src-tauri/target/$(TARGET_LINUX_ARM64)/release/bundle/* $(BIN_DIR)/linux-arm64/ 2>/dev/null || true; \
	fi

build-linux: build-linux-amd64 build-linux-arm64

build-macos-amd64: | $(BIN_DIR)
	$(TAURI_CLI) build --target $(TARGET_MACOS_AMD64)
	@if [ -d "src-tauri/target/$(TARGET_MACOS_AMD64)/release/bundle" ]; then \
		mkdir -p $(BIN_DIR)/macos-amd64 && cp -r src-tauri/target/$(TARGET_MACOS_AMD64)/release/bundle/* $(BIN_DIR)/macos-amd64/ 2>/dev/null || true; \
	fi

build-macos-arm64: | $(BIN_DIR)
	$(TAURI_CLI) build --target $(TARGET_MACOS_ARM64)
	@if [ -d "src-tauri/target/$(TARGET_MACOS_ARM64)/release/bundle" ]; then \
		mkdir -p $(BIN_DIR)/macos-arm64 && cp -r src-tauri/target/$(TARGET_MACOS_ARM64)/release/bundle/* $(BIN_DIR)/macos-arm64/ 2>/dev/null || true; \
	fi

build-macos: build-macos-amd64 build-macos-arm64
build-darwin: build-macos
build-darwin-amd64: build-macos-amd64
build-darwin-arm64: build-macos-arm64

build-all: build-windows build-linux build-macos

clean:
	rm -rf $(BIN_DIR)
