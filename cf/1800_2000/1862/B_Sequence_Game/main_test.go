package main

import (
	"testing"

	. "github.com/funcdfs/gocph/tool/testutil"
)

// Contest: Codeforces - Codeforces Round 894 (Div. 3) B. Sequence Game
// URL: https://codeforces.com/contest/1862/problem/B
// Time: 2026-03-22 11:45:14

func TestSolution(t *testing.T) {
	Run(t, []Case{
		// case 1
		C(`
6
3
4 6 3
3
1 2 3
5
1 7 9 5 7
1
144
2
1 1
5
1 2 2 1 1
`, `
6
4 3 2 6 3 3
3
1 2 3
6
1 7 9 3 5 7
1
144
2
1 1
6
1 2 2 1 1 1
`),
	}, main)
}

/*

*/
