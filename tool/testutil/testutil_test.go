package testutil

import (
	"fmt"
	"os"
	"strings"
	"testing"
	"time"
)

func mockAdd() {
	var a, b int
	fmt.Scanf("%d %d", &a, &b)
	fmt.Printf("%d\n", a+b)
}

func TestRun(t *testing.T) {
	Run(t, []Case{

		// case 1
		C(`
1 2
`, `
3
`),

		// case 2
		C(`
100 200
`, `
300
`),

		// case 3
		C(`
-5 8
`, `
3
`),
	}, mockAdd)
}

func TestRunTest(t *testing.T) {
	RunTest(t, "single", "10 20\n", "30\n", mockAdd)
}

func TestPanic(t *testing.T) {
	panicFn := func() {
		var arr []int
		fmt.Println(arr[10])
	}
	report, panicked := runSolution(panicFn, "1 2")
	if !panicked {
		t.Fatalf("expected panic to be recovered and reported")
	}
	if !strings.Contains(report, iconPanic) || !strings.Contains(report, "index out of range") {
		t.Errorf("unexpected panic report:\n%s", report)
	}
}

func TestTimeout(t *testing.T) {
	old := Timeout
	Timeout = 100 * time.Millisecond
	t.Cleanup(func() { Timeout = old })

	hang := func() { time.Sleep(time.Hour) }
	output, _, report := runCase("1\n", hang)
	if !strings.Contains(report, iconTimeout) {
		t.Errorf("expected timeout report, got: %q", report)
	}
	_ = output
}

func TestLargeInput(t *testing.T) {
	const n = 50000
	var in strings.Builder
	var wantSum int64
	for i := 0; i < n; i++ {
		fmt.Fprintf(&in, "%d\n", i)
		wantSum += int64(i)
	}

	sumFn := func() {
		var total, x int64
		for {
			if _, err := fmt.Fscan(os.Stdin, &x); err != nil {
				break
			}
			total += x
		}
		fmt.Println(total)
	}
	RunTest(t, "large", in.String(), fmt.Sprintf("%d\n", wantSum), sumFn)
}

func TestStdinStdoutRestored(t *testing.T) {
	stdin, stdout := os.Stdin, os.Stdout
	RunTest(t, "restore", "1 2\n", "3\n", mockAdd)
	if os.Stdin != stdin || os.Stdout != stdout {
		t.Errorf("RunTest did not restore os.Stdin/os.Stdout")
	}
}

func TestStderrCaptured(t *testing.T) {
	fn := func() {
		fmt.Fprintln(os.Stderr, "dbg-hello")
		fmt.Println("ok")
	}
	output, stderr, report := runCase("", fn)
	if report != "" {
		t.Fatalf("unexpected report: %s", report)
	}
	if output != "ok\n" {
		t.Errorf("output = %q, want %q", output, "ok\n")
	}
	if !strings.Contains(stderr, "dbg-hello") {
		t.Errorf("stderr = %q, want it to contain %q", stderr, "dbg-hello")
	}
}

func TestInputConsumedWarning(t *testing.T) {
	fn := func() {
		var x int
		fmt.Fscan(os.Stdin, &x)
		fmt.Fprintln(os.Stderr, "gocph read=1")
		fmt.Println(x)
	}
	output, stderr, report := runCase("1 2 3\n", fn)
	if report != "" {
		t.Fatalf("unexpected report: %s", report)
	}
	if output != "1\n" {
		t.Errorf("output = %q, want %q", output, "1\n")
	}
	warn := checkInputConsumed("1 2 3\n", stderr)
	if !strings.Contains(warn, "输入未读取完整") || !strings.Contains(warn, "2 3") {
		t.Errorf("expected leftover-input warning, got: %q", warn)
	}
}

func TestInputFullyConsumed(t *testing.T) {
	fn := func() {
		var a, b, c int
		fmt.Fscan(os.Stdin, &a, &b, &c)
		fmt.Fprintln(os.Stderr, "gocph read=3")
		fmt.Println(a + b + c)
	}
	output, stderr, report := runCase("1 2 3\n", fn)
	if report != "" {
		t.Fatalf("unexpected report: %s", report)
	}
	if output != "6\n" {
		t.Errorf("output = %q, want %q", output, "6\n")
	}
	if warn := checkInputConsumed("1 2 3\n", stderr); warn != "" {
		t.Errorf("unexpected warning for fully consumed input: %q", warn)
	}
}

func TestMultiline(t *testing.T) {
	multilineFn := func() {
		var n int
		fmt.Scanf("%d", &n)
		for i := 1; i <= n; i++ {
			fmt.Printf("Line %d\n", i)
		}
	}

	Run(t, []Case{

		// case 1
		C(`
3
`, `
Line 1
Line 2
Line 3
`),

		// case 2
		C(`
2
`, `
Line 1
Line 2
`),
	}, multilineFn)
}
