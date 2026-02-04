// link: https://codeforces.com/contest/1872/problem/B
// time: 2026-02-04 16:41:48 https://github.com/funcdfs

// #region main
package main

import (
	"bufio"
	"fmt"
	"math"
	"os"
	"runtime"
	"strings"
)

var _in, _out = new(bufio.Reader), new(bufio.Writer)

func _github_funcdfs[T any](sep, end string, arr ...T) {
	for idx := range arr {
		fmt.Fprint(_out, arr[idx])
		if idx == len(arr)-1 {
			fmt.Fprint(_out, end)
		} else {
			fmt.Fprint(_out, sep)
		}
	}
}
func main() {
	_in = bufio.NewReader(os.Stdin)
	_out = bufio.NewWriter(os.Stdout)
	defer _out.Flush()
	testCaseCnt := input[int]()
	for i := 0; i < testCaseCnt; i++ {
		solve(i + 1)
	}
}
func input[T any]() T { var value T; fmt.Fscan(_in, &value); return value }
func inputSlice[T any](size int) []T {
	data := make([]T, size)
	for idx := 0; idx < size; idx++ {
		data[idx] = input[T]()
	}
	return data
}
func print[T any](arr ...T)   { _github_funcdfs("", "", arr...) }
func println[T any](arr ...T) { _github_funcdfs(" ", "\n", arr...) }
func dbg(args ...any) {
	_, f, l, _ := runtime.Caller(1)
	fmt.Fprintf(os.Stderr, "L%d: ", l)
	msg := ""
	if f, err := os.Open(f); err == nil {
		defer f.Close()
		s := bufio.NewScanner(f)
		for i := 1; i <= l; i++ {
			s.Scan()
		}
		msg = s.Text()
		if i := strings.Index(msg, "dbg("); i >= 0 {
			msg = msg[i+4:]
			if i := strings.LastIndex(msg, ")"); i >= 0 {
				msg = msg[:i]
			}
		}
	}
	names := strings.Split(msg, ",")
	for i, v := range args {
		n := ""
		if i < len(names) {
			n = strings.TrimSpace(names[i])
		}
		if n != "" {
			fmt.Fprintf(os.Stderr, "[%s]={%v} ", n, v)
		} else {
			fmt.Fprintf(os.Stderr, "{%v} ", v)
		}
	}
	fmt.Fprintln(os.Stderr)
}

// #endregion main

// ----------------------------- /* Start of useful functions */ -----------------------------
func solve(_case int) {

	trapsCount := input[int]()
	hs := make(map[int]int)
	for i := 0; i < trapsCount; i++ {
		room := input[int]()
		if _, ok := hs[room]; ok == true {
			hs[room] = min(hs[room], input[int]())
		} else {
			hs[room] = input[int]()
		}
	}

	rightDistance := make(map[int]int)
	for key, val := range hs {
		// rightDistance[key] = (val-(key) -1) /2
		rightDistance[key] = (val - 1) / 2
	}

	ans := math.MaxInt32
	for key, val := range rightDistance {
		ans = min(ans, key+val)
	}

	println(ans)

	// dbg(hs)
	// dbg(rightDistance)
	// dbg(ans)

}

/*

2
5
299
9
9
1
1


*/
// ----------------------------- /* End of useful functions */ -------------------------------
