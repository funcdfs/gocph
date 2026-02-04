package main

import (
	"testing"

	. "github.com/funcdfs/gocph/tool/testutil"
)

// Contest: Codeforces - Codeforces Round 970 (Div. 3) A. Sakurako's Exam
// URL: https://codeforces.com/contest/2008/problem/A
// Time: 2026-02-05 00:25:09

func TestSolution(t *testing.T) {
	Run(t, []Case{
		// case 1
		C(`
5
0 1
0 3
2 0
2 3
3 1
`, `
NO
NO
YES
YES
NO
`),
	}, main)
}
