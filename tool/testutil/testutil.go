package testutil

import (
	"bytes"
	"fmt"
	"io"
	"os"
	"runtime"
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
	output, report := runCase(input, fn)
	if report != "" {
		t.Errorf("%s", report)
		return
	}
	compareOutput(t, name, output, want, input)
}

// runCase pipes input into fn's stdin, captures fn's stdout and runs fn once.
// A non-empty report describes a recovered panic or a timeout; otherwise
// output holds everything fn printed.
func runCase(input string, fn func()) (output, report string) {
	oldStdin, oldStdout := os.Stdin, os.Stdout
	defer func() {
		os.Stdin, os.Stdout = oldStdin, oldStdout
	}()

	inReader, inWriter, _ := os.Pipe()
	outReader, outWriter, _ := os.Pipe()
	os.Stdin, os.Stdout = inReader, outWriter

	// Buffered so the solution goroutine never blocks, even if the main
	// select has already taken the timeout branch.
	done := make(chan error, 1)

	go func() {
		defer inWriter.Close()
		io.Copy(inWriter, strings.NewReader(input))
	}()

	var out bytes.Buffer
	var wg sync.WaitGroup
	wg.Add(1)
	go func() {
		defer wg.Done()
		io.Copy(&out, outReader)
	}()

	go func() {
		defer outWriter.Close()
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
			return out.String(), err.Error()
		}
		return out.String(), ""
	case <-time.After(Timeout):
		// Unblock the pipes so the copy goroutines can finish even if fn is
		// stuck forever (goroutines cannot be killed in Go).
		inReader.Close()
		outWriter.Close()
		wg.Wait()
		return out.String(), fmt.Sprintf("%s\nInput:  %s", iconTimeout, echoInput(input))
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

func compareOutput(t *testing.T, name, got, want, input string) {
	got, want = strings.TrimSpace(got), strings.TrimSpace(want)

	if got == want {
		t.Logf("%s: %s%s !%s", name, colorGreen, iconAccept, colorReset)
		return
	}

	gotLines, wantLines := strings.Split(got, "\n"), strings.Split(want, "\n")
	inputLines := strings.Split(strings.TrimSpace(input), "\n")

	if len(gotLines) > 1 || len(wantLines) > 1 {
		mismatch := findMismatchLine(gotLines, wantLines)
		t.Errorf("%s (first mismatch at line %d):\n%s",
			iconWrong, mismatch,
			formatSideBySide(gotLines, wantLines, inputLines))
		return
	}

	mismatch, formattedGot := formatGotChars(got, want)
	t.Errorf("%s (first mismatch at index %d):\n%s",
		iconWrong, mismatch,
		formatSingleLine(formattedGot, want, inputLines))
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
