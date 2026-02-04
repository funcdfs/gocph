package main

import (
	"testing"

	. "github.com/funcdfs/gocph/tool/testutil"
)

// Contest: Codeforces - Codeforces Round 710 (Div. 3) A. Strange Table
// URL: https://codeforces.com/contest/1506/problem/A
// Time: 2026-02-05 00:37:21

func TestSolution(t *testing.T) {
	Run(t, []Case{
		// case 1
		C(`
5
1 1 1
2 2 3
3 5 11
100 100 7312
1000000 1000000 1000000000000
`, `
1
2
9
1174
1000000000000
`),
	}, main)
}
