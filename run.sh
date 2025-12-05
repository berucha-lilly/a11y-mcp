#!/bin/bash
# GitHub Accessibility Reviewer MCP Server startup script

# Change to script directory
cd "$(dirname "$0")"

# Helper: print usage
print_usage() {
	echo "Usage: $0 [file1] [file2] ..."
	echo "  Analyze one or more files for accessibility violations."
	echo "  If no files are provided, starts the MCP server."
	echo "  Example: $0 test.html src/App.js"
}

# Check for help flag
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
	print_usage
	exit 0
fi

# Check for Node.js
if ! command -v node >/dev/null 2>&1; then
	echo "Error: Node.js is not installed or not in PATH." >&2
	exit 1
fi

# Parse optional flags (--open, --retention=N) and collect files/dirs
OPEN_VIEWER=false
RETENTION=1
SERVE=false
SERVE_PORT=8000
PARALLEL=1
SERVE_TIMEOUT=0
POSITIONAL=()
for arg in "$@"; do
    case "$arg" in
        --open)
            OPEN_VIEWER=true
            shift
            ;;
        --serve)
            SERVE=true
            shift
            ;;
        --serve-port=*)
            SERVE_PORT="${arg#*=}"
            shift
            ;;
        --parallel=*)
            PARALLEL="${arg#*=}"
            shift
            ;;
        --serve-timeout=*)
            SERVE_TIMEOUT="${arg#*=}"
            shift
            ;;
        --retention=*)
            RETENTION="${arg#*=}"
            shift
            ;;
		--serve-only=*)
			SERVE_ONLY=true
			SERVE_ONLY_ARTIFACT="${arg#*=}"
			# empty value allowed; we'll fill later
			shift
			;;
        --stop-server=*)
            STOP_SERVER=true
            STOP_ARTIFACT="${arg#*=}"
            shift
            ;;
        --help|-h)
            print_usage
            exit 0
            ;;
        --*)
            echo "Unknown option: $arg" >&2
            exit 2
            ;;
        *)
            POSITIONAL+=("$arg")
            shift
            ;;
    esac
done

# Helper: pick the latest artifact directory (exclude archive)
pick_latest_artifact() {
	latest=$(ls -1dt artifacts/*/ 2>/dev/null | sed 's:/*$::' | grep -v '^artifacts/archive$' | head -n1)
	echo "$latest"
}

# If user provided positional targets and didn't explicitly request no-serve,
# make the demo flow convenient: after scanning we'll serve the artifact and open the viewer.
if [ ${#POSITIONAL[@]} -gt 0 ] && [ "${SERVE:-false}" != true ] && [ "${SERVE_ONLY:-false}" != true ]; then
	DEMO_SERVE=true
	OPEN_VIEWER=true
fi

# Helper: start an HTTP server for an artifact folder reliably.
# Arguments: <artifact_dir> <start_port>
start_server() {
	local ART_DIR="$1"
	local START_PORT="$2"
	local PORT="$START_PORT"
	local BG_PID=""
	local SERVER_PID=""
	for p in $(seq "$START_PORT" $((START_PORT + 10))); do
		PORT="$p"
		# skip if another process already listening
		if lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
			continue
		fi
		# try to start server
		if command -v python3 >/dev/null 2>&1; then
			nohup sh -c "cd '$ART_DIR' && python3 -m http.server $PORT" >/dev/null 2>&1 &
			BG_PID=$!
		elif command -v python >/dev/null 2>&1; then
			nohup sh -c "cd '$ART_DIR' && python -m SimpleHTTPServer $PORT" >/dev/null 2>&1 &
			BG_PID=$!
		else
			echo "No python available to start HTTP server." >&2
			return 2
		fi

		# wait for server to be reachable
		attempts=0
		ready=false
		while [ $attempts -lt 30 ]; do
			# check HTTP endpoint
			if curl -sS --max-time 1 "http://localhost:$PORT/viewer/index.html" >/dev/null 2>&1; then
				ready=true
				break
			fi
			sleep 0.2
			attempts=$((attempts+1))
		done

		if [ "$ready" = true ]; then
			# try to detect PID via lsof, else use BG_PID
			if command -v lsof >/dev/null 2>&1; then
				PID_CAND=$(lsof -nP -iTCP:"$PORT" -sTCP:LISTEN 2>/dev/null | awk 'NR>1{print $2; exit}')
				SERVER_PID=${PID_CAND:-$BG_PID}
			else
				SERVER_PID=$BG_PID
			fi
			# write pid and viewer.url
			mkdir -p "$ART_DIR" >/dev/null 2>&1 || true
			echo "$SERVER_PID" > "$ART_DIR/server.pid" 2>/dev/null || true
			echo "http://localhost:$PORT/viewer/index.html" > "$ART_DIR/viewer.url" 2>/dev/null || true
			echo "Wrote PID $SERVER_PID to $ART_DIR/server.pid"
			echo "Viewer URL: http://localhost:$PORT/viewer/index.html"
			# schedule shutdown if requested (SERVE_TIMEOUT in minutes)
			if [ "$SERVE_TIMEOUT" -gt 0 ]; then
				( sleep $((SERVE_TIMEOUT * 60)) ; kill "$SERVER_PID" >/dev/null 2>&1 || true ; rm -f "$ART_DIR/server.pid" >/dev/null 2>&1 || true ) &
			fi
			return 0
		else
			# failed to start on this port; kill bg and try next
			[ -n "$BG_PID" ] && kill "$BG_PID" >/dev/null 2>&1 || true
			BG_PID=""
			SERVER_PID=""
			continue
		fi
	done
	echo "Failed to start HTTP server on ports $START_PORT..$((START_PORT+10))" >&2
	return 1
}

# If --serve-only was passed without positional args, auto-serve latest artifact
if [ "${SERVE_ONLY:-false}" = true ] && [ ${#POSITIONAL[@]} -eq 0 ]; then
	if [ -z "$SERVE_ONLY_ARTIFACT" ]; then
		echo "No artifact provided to --serve-only; attempting to auto-select latest artifact..."
		LATEST_ARTIFACT=$(pick_latest_artifact)
		if [ -z "$LATEST_ARTIFACT" ]; then
			echo "No artifacts found in artifacts/; run a scan first or specify an artifact with --serve-only=PATH" >&2
			exit 1
		fi
		ARTIFACT_DIR="$LATEST_ARTIFACT"
	else
		ARTIFACT_DIR="$SERVE_ONLY_ARTIFACT"
	fi
	if [ ! -d "$ARTIFACT_DIR" ]; then
		echo "Artifact folder not found: $ARTIFACT_DIR" >&2
		exit 2
	fi
	echo "Serving artifact: $ARTIFACT_DIR"
	start_server "$ARTIFACT_DIR" "$SERVE_PORT"
	# If requested, open the viewer URL that was written by start_server
	if [ "$OPEN_VIEWER" = true ]; then
		VIEWER_URL=$(cat "$ARTIFACT_DIR/viewer.url" 2>/dev/null || echo "http://localhost:$SERVE_PORT/viewer/index.html")
		if command -v open >/dev/null 2>&1; then
			open "$VIEWER_URL"
		elif command -v xdg-open >/dev/null 2>&1; then
			xdg-open "$VIEWER_URL" >/dev/null 2>&1 &
		else
			echo "Open the viewer by visiting: $VIEWER_URL" >&2
		fi
	fi
	exit 0
fi

# If --serve was requested but no scan targets were provided, auto-serve latest artifact
if [ "$SERVE" = true ] && [ ${#POSITIONAL[@]} -eq 0 ]; then
	echo "--serve requested but no scan targets provided; attempting to auto-serve the latest artifact..."
	LATEST_ARTIFACT=$(pick_latest_artifact)
	if [ -z "$LATEST_ARTIFACT" ]; then
		echo "No artifacts found in artifacts/; run a scan first or provide targets to scan." >&2
		exit 1
	fi
	ARTIFACT_DIR="$LATEST_ARTIFACT"
	echo "Serving artifact: $ARTIFACT_DIR"
	start_server "$ARTIFACT_DIR" "$SERVE_PORT"
	# If requested, open the viewer URL
	if [ "$OPEN_VIEWER" = true ]; then
		VIEWER_URL=$(cat "$ARTIFACT_DIR/viewer.url" 2>/dev/null || echo "http://localhost:$SERVE_PORT/viewer/index.html")
		if command -v open >/dev/null 2>&1; then
			open "$VIEWER_URL"
		elif command -v xdg-open >/dev/null 2>&1; then
			xdg-open "$VIEWER_URL" >/dev/null 2>&1 &
		else
			echo "Open the viewer by visiting: $VIEWER_URL" >&2
		fi
	fi
	exit 0
fi


# Helper: start an HTTP server for an artifact folder reliably.
# Arguments: <artifact_dir> <start_port>
start_server() {
	local ART_DIR="$1"
	local START_PORT="$2"
	local PORT="$START_PORT"
	local BG_PID=""
	local SERVER_PID=""
	for p in $(seq "$START_PORT" $((START_PORT + 10))); do
		PORT="$p"
		# skip if another process already listening
		if lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
			continue
		fi
		# try to start server
		if command -v python3 >/dev/null 2>&1; then
			nohup sh -c "cd '$ART_DIR' && python3 -m http.server $PORT" >/dev/null 2>&1 &
			BG_PID=$!
		elif command -v python >/dev/null 2>&1; then
			nohup sh -c "cd '$ART_DIR' && python -m SimpleHTTPServer $PORT" >/dev/null 2>&1 &
			BG_PID=$!
		else
			echo "No python available to start HTTP server." >&2
			return 2
		fi

		# wait for server to be reachable
		attempts=0
		ready=false
		while [ $attempts -lt 30 ]; do
			# check HTTP endpoint
			if curl -sS --max-time 1 "http://localhost:$PORT/viewer/index.html" >/dev/null 2>&1; then
				ready=true
				break
			fi
			sleep 0.2
			attempts=$((attempts+1))
		done

		if [ "$ready" = true ]; then
			# try to detect PID via lsof, else use BG_PID
			if command -v lsof >/dev/null 2>&1; then
				PID_CAND=$(lsof -nP -iTCP:"$PORT" -sTCP:LISTEN 2>/dev/null | awk 'NR>1{print $2; exit}')
				SERVER_PID=${PID_CAND:-$BG_PID}
			else
				SERVER_PID=$BG_PID
			fi
			# write pid and viewer.url
			mkdir -p "$ART_DIR" >/dev/null 2>&1 || true
			echo "$SERVER_PID" > "$ART_DIR/server.pid" 2>/dev/null || true
			echo "http://localhost:$PORT/viewer/index.html" > "$ART_DIR/viewer.url" 2>/dev/null || true
			echo "Wrote PID $SERVER_PID to $ART_DIR/server.pid"
			echo "Viewer URL: http://localhost:$PORT/viewer/index.html"
			return 0
		else
			# failed to start on this port; kill bg and try next
			[ -n "$BG_PID" ] && kill "$BG_PID" >/dev/null 2>&1 || true
			BG_PID=""
			SERVER_PID=""
			continue
		fi
	done
	echo "Failed to start HTTP server on ports $START_PORT..$((START_PORT+10))" >&2
	return 1
}

# If file arguments are provided, analyze each
if [ ${#POSITIONAL[@]} -gt 0 ]; then
	# If serve-only was requested, start server on provided artifact and exit
	if [ "${SERVE_ONLY:-false}" = true ]; then
		# If no artifact path was provided, try to pick the latest artifact
		if [ -z "$SERVE_ONLY_ARTIFACT" ]; then
			echo "No artifact provided to --serve-only; attempting to auto-select latest artifact..."
			LATEST_ARTIFACT=$(pick_latest_artifact)
			if [ -z "$LATEST_ARTIFACT" ]; then
				echo "No artifacts found in artifacts/; run a scan first or specify an artifact with --serve-only=PATH" >&2
				exit 1
			fi
			ARTIFACT_DIR="$LATEST_ARTIFACT"
		else
			ARTIFACT_DIR="$SERVE_ONLY_ARTIFACT"
		fi
		if [ ! -d "$ARTIFACT_DIR" ]; then
			echo "Artifact folder not found: $ARTIFACT_DIR" >&2
			exit 2
		fi
		# Start server (reuse serve logic below by setting SERVE true)
		SERVE=true
		# skip scanning and jump to serve logic by creating it and then exiting after serve steps
		files_to_analyze=("$ARTIFACT_DIR/viewer/index.html")
	fi
	# If the user requested to stop a server for a given artifact, handle it first
	if [ "${STOP_SERVER:-false}" = true ]; then
		# STOP_ARTIFACT may be provided or the first positional arg
		if [ "$SERVE" = true ] || [ "${DEMO_SERVE:-false}" = true ]; then
			start_server "$ARTIFACT_DIR" "$SERVE_PORT"
			rc=$?
			if [ $rc -ne 0 ]; then
				echo "Failed to start server (see above)." >&2
			else
				# schedule shutdown if requested (SERVE_TIMEOUT in minutes)
				if [ "$SERVE_TIMEOUT" -gt 0 ]; then
					PID=$(cat "$ARTIFACT_DIR/server.pid" 2>/dev/null || true)
					if [ -n "$PID" ]; then
						( sleep $((SERVE_TIMEOUT * 60)) ; kill "$PID" >/dev/null 2>&1 || true ; rm -f "$ARTIFACT_DIR/server.pid" >/dev/null 2>&1 || true ) &
					fi
				fi
				VIEWER_URL=$(cat "$ARTIFACT_DIR/viewer.url" 2>/dev/null || echo "http://localhost:$SERVE_PORT/viewer/index.html")
				echo "Viewer URL: $VIEWER_URL"
				if [ "$OPEN_VIEWER" = true ]; then
					if command -v open >/dev/null 2>&1; then
						open "$VIEWER_URL"
					elif command -v xdg-open >/dev/null 2>&1; then
						xdg-open "$VIEWER_URL" >/dev/null 2>&1 &
					else
						echo "Open the viewer by visiting: $VIEWER_URL" >&2
					fi
				fi
				echo "HTTP server PID: $(cat "$ARTIFACT_DIR/server.pid" 2>/dev/null || echo unknown) (serving $ARTIFACT_DIR)"
			fi
		else
	mkdir -p "$ARTIFACT_DIR"
	results_file="${ARTIFACT_DIR}/a11y-results-${TS}.txt"

	# Initialize counters
	total_violations=0
	files_with_violations=0

	echo "Accessibility Scan Results" > "$results_file"
	echo "Files scanned: ${#files_to_analyze[@]}" >> "$results_file"
	echo "----------------------------------------" >> "$results_file"
	if [ "$PARALLEL" -gt 1 ]; then
		# Use Node helper to scan in parallel
		node scripts/scan-parallel.js "$PARALLEL" "$ARTIFACT_DIR" "${files_to_analyze[@]}"
		scan_status=$?
		# Consolidate human-readable outputs from hr/ into results_file
		if [ -d "$ARTIFACT_DIR/hr" ]; then
			for h in "$ARTIFACT_DIR"/hr/*.txt; do
				[ -f "$h" ] || continue
				cat "$h" >> "$results_file"
				echo "----------------------------------------" >> "$results_file"
				# Simple heuristic to count violations lines
				count=$(grep -oE 'Found [0-9]+ accessibility violation' "$h" | grep -oE '[0-9]+' | paste -sd+ - | bc 2>/dev/null || true)
				if [ -n "$count" ]; then
					total_violations=$((total_violations+count))
				fi
				if grep -q 'Found [0-9]+ accessibility violation' "$h" 2>/dev/null; then
					files_with_violations=$((files_with_violations+1))
				fi
			done
		fi
	else
		for file in "${files_to_analyze[@]}"; do
			echo "Analyzing file: $file" >&2
			BN=$(basename "$file")
			JSON_OUT="${ARTIFACT_DIR}/${BN}.json"

			# Try to produce machine-readable JSON output first
			node cli-scanner.js "$file" --json > "$JSON_OUT" 2>/dev/null
			status_json=$?

			# Always produce human-readable output for the consolidated report
			HR_OUT=$(node cli-scanner.js "$file" 2>&1)
			status_hr=$?

			# Decide which status to use and ensure JSON exists
			if [ -s "$JSON_OUT" ]; then
				status=$status_json
			else
				status=$status_hr
				rm -f "$JSON_OUT" 2>/dev/null || true
			fi

			# Append human-readable output to the results file
			echo "$HR_OUT" >> "$results_file"
			echo "----------------------------------------" >> "$results_file"

			# Handle scanner exit status
			if [ "$status" -eq 2 ] 2>/dev/null; then
				echo "Error: File not found or could not be read: $file" >> "$results_file"
			elif [ "$status" -eq 1 ] 2>/dev/null; then
				echo "Error: Invalid usage or unsupported file: $file" >> "$results_file"
			elif [ "$status" -ne 0 ] 2>/dev/null; then
				files_with_violations=$((files_with_violations+1))
				# Extract number of violations from human-readable output
				count=$(echo "$HR_OUT" | grep -oE 'Found [0-9]+ accessibility violation' | grep -oE '[0-9]+' | head -1)
				if [ -n "$count" ]; then
					total_violations=$((total_violations+count))
				fi
			fi
		done
	fi
	echo "===== Accessibility Scan Summary =====" >> "$results_file"
	echo "Files analyzed: ${#files_to_analyze[@]}" >> "$results_file"
	echo "Files with violations: $files_with_violations" >> "$results_file"
	echo "Total violations found: $total_violations" >> "$results_file"
	echo "Scan finished: $(date)" >> "$results_file"


			if [ -f "$VIEWER_INDEX" ]; then
				if command -v open >/dev/null 2>&1; then
					open "$VIEWER_INDEX"
				elif command -v xdg-open >/dev/null 2>&1; then
					xdg-open "$VIEWER_INDEX" >/dev/null 2>&1 &
				else
					echo "Viewer created at: $VIEWER_INDEX" >&2
				fi
			else
				echo "Viewer not found in artifacts; open $ARTIFACT_DIR/combined.json manually." >&2
			fi
		fi
	fi

	if [ ${total_violations:-0} -gt 0 ]; then
		exit 3
	else
		exit 0
	fi
else
	# Start the proper MCP server
	echo "Starting GitHub Accessibility Reviewer MCP Server..." >&2
	# Start the production MCP server
	exec node src/mcp-server.js
fi