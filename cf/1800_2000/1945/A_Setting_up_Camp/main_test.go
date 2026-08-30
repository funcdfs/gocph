package main

import (
	"testing"

	. "github.com/funcdfs/gocph/tool/testutil"
)

// Contest: Codeforces - Codeforces Round 935 (Div. 3) A. Setting up Camp
// URL: https://codeforces.com/contest/1945/problem/A
// Time: 2026-08-30 14:35:34

func TestSolution(t *testing.T) {
	Run(t, []Case{
		// case 1
		C(`
10
1 2 3
1 4 1
1 4 2
1 1 1
1 3 2
19 7 18
0 0 0
7 0 0
0 24 0
1000000000 1000000000 1000000000
`, `
3
-1
3
-1
3
28
0
7
8
1666666667
`),
	}, main)
}

/*

*/
