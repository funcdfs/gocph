package testutil

import (
	"fmt"
	"strings"
	"testing"
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
