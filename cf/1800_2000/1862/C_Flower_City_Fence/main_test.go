package main

import (
	"testing"

	. "github.com/funcdfs/gocph/tool/testutil"
)

// Contest: Codeforces - Codeforces Round 894 (Div. 3) C. Flower City Fence
// URL: https://codeforces.com/contest/1862/problem/C
// Time: 2026-03-22 12:25:56

func TestSolution(t *testing.T) {
	Run(t, []Case{
		// case 1
		C(`
7
5
5 4 3 2 1
3
3 1 1
3
4 2 1
1
2
5
5 3 3 1 1
5
5 5 5 3 3
2
6 1
`, `
YES
YES
NO
NO
YES
YES
NO
`),
	}, main)
}

/*

*/
