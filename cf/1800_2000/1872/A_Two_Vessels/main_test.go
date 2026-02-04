package main

import (
	"testing"

	. "github.com/funcdfs/gocph/tool/testutil"
)

// Contest: Codeforces - Codeforces Round 895 (Div. 3) A. Two Vessels
// URL: https://codeforces.com/contest/1872/problem/A
// Time: 2026-02-04 16:34:26

func TestSolution(t *testing.T) {
	Run(t, []Case{
		// case 1
		C(`
6
3 7 2
17 4 3
17 17 1
17 21 100
1 100 1
97 4 3
`, `
1
3
0
1
50
16
`),
		// case 2
		C(`
2
1 2 1
1 3 3
`, `
1
1
`),
		// case 3
		C(`
1
1 4 2
`, `
1
`),
	}, main)
}
