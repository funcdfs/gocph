package testutil

import (
	"bytes"
	"fmt"
	"io"
	"os"
	"runtime"
	"strconv"
	"strings"
	"sync"
	"testing"
	"time"
)

// ================================ Constants ================================

const (
	colorReset    = "\033[0m"
	colorRed      = "\033[31m"
	colorGreen    = "\033[32m"
	colorBlue     = "\033[34m"
	colorLavender = "\033[38;2;180;150;200m"

	iconPanic   = "🔥 PANIC"
	iconWrong   = "❌ WRONG"
	iconAccept  = "✅ ACCEPT"
	iconTimeout = "❌ TIMEOUT"
)

// ================================ Test Case API ================================

// Case represents a single test case
type Case struct {
	Input  string
	Expect string
}

// C creates a Case from raw multi-line strings (direct copy-paste from website)
func C(input, expect string) Case {
	return Case{
		Input:  strings.TrimSpace(input) + "\n",
		Expect: strings.TrimSpace(expect) + "\n",
	}
}

// Run executes all test cases against the provided main function
func Run(t *testing.T, cases []Case, fn func()) {
	for i, c := range cases {
		name := fmt.Sprintf("case%d", i+1)
		t.Run(name, func(t *testing.T) {
			RunTest(t, name, c.Input, c.Expect, fn)
		})
	}
}

// ================================ Core Test Runner ================================

// Timeout is the per-case execution limit. A solution exceeding it is reported
// as a timeout; its goroutines cannot be killed but the pipes are closed so
// the harness itself never leaks or blocks.
var Timeout = 5 * time.Second

// RunTest runs a single test case by simulating stdin/stdout
func RunTest(t *testing.T, name, input, want string, fn func()) {
	output, stderr, report := runCase(input, fn)
	if report != "" {
		t.Errorf("%s%s", report, stderrReport(stderr))
		return
	}
	msg, ok := compareOutput(name, output, want, input)
	if !ok {
		t.Errorf("%s%s%s", msg, checkInputConsumed(input, stderr), stderrReport(stderr))
		return
	}
	if stderr != "" {
		t.Logf("stderr:\n%s", stderr)
	}
	t.Logf("%s", msg)
}

// runCase pipes input into fn's stdin, captures fn's stdout/stderr and runs
// fn once. A non-empty report describes a recovered panic or a timeout;
// otherwise output holds everything fn printed.
func runCase(input string, fn func()) (output, stderr, report string) {
	oldStdin, oldStdout, oldStderr := os.Stdin, os.Stdout, os.Stderr
	defer func() {
		os.Stdin, os.Stdout, os.Stderr = oldStdin, oldStdout, oldStderr
	}()

	inReader, inWriter, _ := os.Pipe()
	outReader, outWriter, _ := os.Pipe()
	errReader, errWriter, _ := os.Pipe()
	os.Stdin, os.Stdout, os.Stderr = inReader, outWriter, errWriter

	// Buffered so the solution goroutine never blocks, even if the main
	// select has already taken the timeout branch.
	done := make(chan error, 1)

	go func() {
		defer inWriter.Close()
		io.Copy(inWriter, strings.NewReader(input))
	}()

	var out, errOut bytes.Buffer
	var wg sync.WaitGroup
	wg.Add(2)
	go func() {
		defer wg.Done()
		io.Copy(&out, outReader)
	}()
	go func() {
		defer wg.Done()
		io.Copy(&errOut, errReader)
	}()

	go func() {
		defer outWriter.Close()
		defer errWriter.Close()
		rep, panicked := runSolution(fn, input)
		if panicked {
			done <- fmt.Errorf("%s", rep)
			return
		}
		done <- nil
	}()

	select {
	case err := <-done:
		wg.Wait()
		if err != nil {
			return out.String(), errOut.String(), err.Error()
		}
		return out.String(), errOut.String(), ""
	case <-time.After(Timeout):
		// Unblock the pipes so the copy goroutines can finish even if fn is
		// stuck forever (goroutines cannot be killed in Go).
		inReader.Close()
		outWriter.Close()
		errWriter.Close()
		wg.Wait()
		return out.String(), errOut.String(), fmt.Sprintf("%s\nInput:  %s", iconTimeout, echoInput(input))
	}
}

// echoInput formats the input lines (lavender, indented) for error reports.
func echoInput(input string) string {
	inputLines := strings.Split(strings.TrimSpace(input), "\n")
	var b strings.Builder
	for i, line := range inputLines {
		if i > 0 {
			b.WriteString("        ")
		}
		b.WriteString(fmt.Sprintf("%s%s%s\n", colorLavender, line, colorReset))
	}
	return b.String()
}

// runSolution runs fn and converts a recovered panic into a formatted report.
func runSolution(fn func(), input string) (report string, panicked bool) {
	defer func() {
		if r := recover(); r != nil {
			report = fmt.Sprintf("%s:\n%s%s%s, %sError: %v%s\nInput:  %s",
				iconPanic,
				colorBlue, extractLineNum(), colorReset,
				colorRed, r, colorReset,
				echoInput(input))
			panicked = true
		}
	}()
	fn()
	return
}

// ================================ Output Comparison ================================

// compareOutput builds the pass/fail result for one case. ok reports whether
// got matches want; msg is the accept log line or the failure report.
func compareOutput(name, got, want, input string) (msg string, ok bool) {
	got, want = strings.TrimSpace(got), strings.TrimSpace(want)

	if got == want {
		return fmt.Sprintf("%s: %s%s !%s", name, colorGreen, iconAccept, colorReset), true
	}

	gotLines, wantLines := strings.Split(got, "\n"), strings.Split(want, "\n")
	inputLines := strings.Split(strings.TrimSpace(input), "\n")

	if len(gotLines) > 1 || len(wantLines) > 1 {
		mismatch := findMismatchLine(gotLines, wantLines)
		return fmt.Sprintf("%s (first mismatch at line %d):\n%s",
			iconWrong, mismatch,
			formatSideBySide(gotLines, wantLines, inputLines)), false
	}

	mismatch, formattedGot := formatGotChars(got, want)
	return fmt.Sprintf("%s (first mismatch at index %d):\n%s",
		iconWrong, mismatch,
		formatSingleLine(formattedGot, want, inputLines)), false
}

// stderrReport formats captured stderr for inclusion in a failure report.
func stderrReport(stderr string) string {
	if stderr == "" {
		return ""
	}
	return "\n──── stderr ────\n" + stderr
}

// checkInputConsumed compares the "gocph read=N" marker the solution writes to
// stderr against the number of whitespace-separated items in input. Fewer
// reads than items usually means some input was missed (a forgotten read, a
// misaligned multi-case loop, or an unexpected EOF).
func checkInputConsumed(input, stderr string) string {
	const marker = "gocph read="
	idx := strings.LastIndex(stderr, marker)
	if idx == -1 {
		return ""
	}
	digits := stderr[idx+len(marker):]
	if end := strings.IndexFunc(digits, func(r rune) bool { return r < '0' || r > '9' }); end != -1 {
		digits = digits[:end]
	}
	read, err := strconv.Atoi(digits)
	if err != nil {
		return ""
	}
	fields := strings.Fields(input)
	if read >= len(fields) {
		return ""
	}
	preview := strings.Join(fields[read:min(read+10, len(fields))], " ")
	if len(fields)-read > 10 {
		preview += " …"
	}
	return fmt.Sprintf("\n⚠️ 输入未读取完整: 输入共 %d 个数据项, 实际读取 %d 个, 未读取: %s\n",
		len(fields), read, preview)
}

// ================================ Formatting Helpers ================================

func findMismatchLine(got, want []string) int {
	for i, line := range got {
		if i >= len(want) || line != want[i] {
			return i + 1
		}
	}
	return min(len(got), len(want)) + 1
}

func formatSideBySide(got, want, input []string) string {
	maxRows := max(max(len(got), len(want)), len(input))

	// Calculate column widths
	gotWidth := maxLineWidth(got)
	wantWidth := maxLineWidth(want)
	if gotWidth < 10 {
		gotWidth = 10
	}
	if wantWidth < 10 {
		wantWidth = 10
	}

	var b strings.Builder
	b.WriteString(fmt.Sprintf("%-*s    %-*s    %s\n", gotWidth+4, "Got", wantWidth+4, "Expect", "Input"))

	for i := 0; i < maxRows; i++ {
		isMatch := i < len(got) && i < len(want) && got[i] == want[i]

		// Got column
		if i < len(got) {
			color := colorGreen
			if !isMatch {
				color = colorRed
			}
			b.WriteString(fmt.Sprintf("%s%d │ %-*s%s", color, i+1, gotWidth, got[i], colorReset))
		} else {
			b.WriteString(fmt.Sprintf("%-*s", gotWidth+4, ""))
		}
		b.WriteString("    ")

		// Expect column
		if i < len(want) {
			color := colorGreen
			if !isMatch {
				color = colorBlue
			}
			b.WriteString(fmt.Sprintf("%s%d │ %-*s%s", color, i+1, wantWidth, want[i], colorReset))
		} else {
			b.WriteString(fmt.Sprintf("%-*s", wantWidth+4, ""))
		}
		b.WriteString("    ")

		// Input column (lavender)
		if i < len(input) {
			b.WriteString(fmt.Sprintf("%s%d │ %s%s", colorLavender, i+1, input[i], colorReset))
		}
		b.WriteString("\n")
	}
	return b.String()
}

func formatSingleLine(formattedGot, want string, input []string) string {
	var b strings.Builder
	b.WriteString(fmt.Sprintf("Got:    %s\n", formattedGot))
	b.WriteString(fmt.Sprintf("Expect: %s%s%s\n", colorBlue, want, colorReset))
	b.WriteString("Input:  ")
	for i, line := range input {
		if i > 0 {
			b.WriteString("        ")
		}
		b.WriteString(fmt.Sprintf("%s%s%s\n", colorLavender, line, colorReset))
	}
	return b.String()
}

func maxLineWidth(lines []string) int {
	maxW := 0
	for _, line := range lines {
		if len(line) > maxW {
			maxW = len(line)
		}
	}
	return maxW
}

func formatGotChars(got, want string) (int, string) {
	mismatch := -1
	var b strings.Builder
	maxLen := max(len(got), len(want))
	for i := 0; i < maxLen; i++ {
		if i < len(got) {
			color := colorGreen
			if i >= len(want) || got[i] != want[i] {
				color = colorRed
				if mismatch == -1 {
					mismatch = i
				}
			}
			b.WriteString(fmt.Sprintf("%s%c%s", color, got[i], colorReset))
		}
	}
	if mismatch == -1 {
		mismatch = maxLen
	}
	return mismatch, b.String()
}

func extractLineNum() string {
	buf := make([]byte, 4096)
	n := runtime.Stack(buf, false)
	for _, line := range strings.Split(string(buf[:n]), "\n") {
		if idx := strings.LastIndex(line, "/main.go:"); idx != -1 {
			s := line[idx+len("/main.go:"):]
			if end := strings.Index(s, " "); end != -1 {
				return s[:end]
			}
			return s
		}
	}
	return "unknown"
}
