// link: https://codeforces.com/contest/1945/problem/C
// time: 2026-08-30 23:37:30 https://github.com/funcdfs


// #region main
package main

import (
	"bufio"
	"fmt"
	"os"
	"runtime"
	"strings"
)

var (
	_in  = bufio.NewReaderSize(os.Stdin, 1<<16)
	_out = bufio.NewWriterSize(os.Stdout, 1<<16)
)

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

	n := input[int]()
	arr := inputSlice[int](n)

	// 从前往后记录这个0:1多的Index，然后从后往前记录这个1:0多的Index。然后从中间开始找，从中间位置向左向右找。他们两个Index距离中间最近的那一个Index就是中间的那一个Index。
	
}

// ----------------------------- /* End of useful functions */ -------------------------------