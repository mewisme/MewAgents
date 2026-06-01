.PHONY: help \
	agents-build agents-test agents-vet agents-fmt agents-check \
	web-dev web-build web-lint web-docker-build \
	fw-set-target fw-build fw-flash fw-monitor fw-clean fw-help fw-config

AGENTS_DIR := apps/agents
WEB_DIR := apps/web
FW_DIR := apps/firmware
WEB_IMAGE ?= mew-agents-web:local

# ESP-IDF v5.5.3 (Windows). Override if your profile path differs — see .cursor/skills/esp-idf-environment/
IDF_PS_PROFILE ?= C:/Espressif/tools/Microsoft.v5.5.3.PowerShell_profile.ps1
IDF_TARGET ?= esp32s3
# Serial port for flash/monitor, e.g. make fw-flash PORT=COM3
PORT ?=
IDF_PORT_ARGS = $(if $(PORT),-p $(PORT) ,)

ifeq ($(OS),Windows_NT)
define run-idf
	powershell -NoProfile -Command ". '$(IDF_PS_PROFILE)'; Set-Location '$(CURDIR)/$(FW_DIR)'; idf.py $(1)"
endef
else
define run-idf
	cd $(FW_DIR) && idf.py $(1)
endef
endif

.DEFAULT_GOAL := help

help:
	@echo "Mew Agents monorepo"
	@echo ""
	@echo "Agents:"
	@echo "  make agents-build   Build mewagents binary"
	@echo "  make agents-test    Run all Go tests"
	@echo "  make agents-vet     Run go vet"
	@echo "  make agents-fmt     Run gofmt -w"
	@echo "  make agents-check   fmt + vet + test"
	@echo ""
	@echo "Firmware (ESP-IDF; Windows loads $(IDF_PS_PROFILE)):"
	@echo "  make fw-set-target  idf.py set-target (IDF_TARGET=$(IDF_TARGET))"
	@echo "  make fw-build       Build firmware"
	@echo "  make fw-flash       Flash (optional PORT=COMx)"
	@echo "  make fw-monitor     Serial monitor (optional PORT=COMx)"
	@echo "  make fw-clean       Clean build artifacts"
	@echo "  make fw-config      menuconfig"
	@echo "  make fw-help        idf.py --help"
	@echo ""
	@echo "Web:"
	@echo "  make web-dev          Start dev server"
	@echo "  make web-build        Production build"
	@echo "  make web-lint         Run ESLint"
	@echo "  make web-docker-build Build Docker image (WEB_IMAGE=$(WEB_IMAGE))"

agents-build:
	cd $(AGENTS_DIR) && go build -ldflags="-s -w" -o mewagents .

agents-test:
	cd $(AGENTS_DIR) && go test ./...

agents-vet:
	cd $(AGENTS_DIR) && go vet ./...

agents-fmt:
	cd $(AGENTS_DIR) && gofmt -w .

agents-check: agents-fmt agents-vet agents-test

fw-set-target:
	$(call run-idf,set-target $(IDF_TARGET))

fw-build:
	$(call run-idf,build)

fw-flash:
	$(call run-idf,$(IDF_PORT_ARGS)flash)

fw-monitor:
	$(call run-idf,$(IDF_PORT_ARGS)monitor)

fw-clean:
	$(call run-idf,clean)

fw-help:
	$(call run-idf,--help)

fw-config:
	$(call run-idf,menuconfig)

web-dev:
	cd $(WEB_DIR) && pnpm dev

web-build:
	cd $(WEB_DIR) && pnpm build

web-lint:
	cd $(WEB_DIR) && pnpm lint

web-docker-build:
	docker build -t $(WEB_IMAGE) -f $(WEB_DIR)/Dockerfile $(WEB_DIR)
