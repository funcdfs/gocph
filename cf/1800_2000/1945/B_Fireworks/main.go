// link: https://codeforces.com/contest/1945/problem/B
// time: 2026-08-30 22:13:20 https://github.com/funcdfs

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
		if idx > 0 {
			fmt.Fprint(_out, sep)
		}
		fmt.Fprint(_out, arr[idx])
	}
	fmt.Fprint(_out, end)
}
func main() {
	_in = bufio.NewReaderSize(os.Stdin, 1<<16)
	_out = bufio.NewWriterSize(os.Stdout, 1<<16)
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
func print[T any](arr ...T) { _github_funcdfs("", "", arr...) }
func pln[T any](arr ...T)   { _github_funcdfs(" ", "\n", arr...) }
func printf(format string, args ...any) { fmt.Fprintf(_out, format, args...) }
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

	a, b, m := input[int](), input[int](), input[int]()
	pln(m/a + m/b + 2)
}

// ----------------------------- /* End of useful functions */ -------------------------------