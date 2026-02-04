// link: https://codeforces.com/contest/2008/problem/A
// time: 2026-02-05 00:25:09 https://github.com/funcdfs

// #region main
package main

import (
	"bufio"
	"fmt"
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

	a, b := input[int](), input[int]()
	// a 个一，b 个二
	// 必须在每个元素前面加上 "+"或"-"，这样数组中所有元素的和就等于 0
	// 不确定是否有可能解决这个问题，所以要确定是否有办法分配符号，使数组中所有元素的和等于 0

	check := func() bool {
		if a%2 != 0 {
			return false
		}
		if a == 0 && b%2 != 0 {
			return false
		}
		return true
	}
	if check() {
		println("YES")
	} else {
		println("NO")
	}

}

// ----------------------------- /* End of useful functions */ -------------------------------
