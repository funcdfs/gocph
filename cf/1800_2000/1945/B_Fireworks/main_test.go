package main

import (
	"testing"

	. "github.com/funcdfs/gocph/tool/testutil"
)

// Contest: Codeforces - Codeforces Round 935 (Div. 3) B. Fireworks
// URL: https://codeforces.com/contest/1945/problem/B
// Time: 2026-08-30 14:52:09

func TestSolution(t *testing.T) {
	Run(t, []Case{
		// case 1
		C(`
6
6 7 4
3 4 10
7 8 56
5 6 78123459896
1 1 1
1 1 1000000000000000000
`, `
2
7
17
28645268630
4
2000000000000000002
`),
	}, main)
}

/*

*/
