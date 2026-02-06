package main

import (
	"testing"

	. "github.com/funcdfs/gocph/tool/testutil"
)

// Contest: AtCoder - AtCoder Beginner Contest 395 A - Strictly Increasing?
// URL: https://atcoder.jp/contests/abc395/tasks/abc395_a
// Time: 2026-02-06 12:23:51

func TestSolution(t *testing.T) {
	Run(t, []Case{
		// case 1
		C(`
3
1 2 5
`, `
Yes
`),
		// case 2
		C(`
3
3 9 5
`, `
No
`),
		// case 3
		C(`
10
1 1 2 3 5 8 13 21 34 55
`, `
No
`),
	}, main)
}

/*

*/
