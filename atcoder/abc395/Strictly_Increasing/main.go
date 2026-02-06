// link: https://atcoder.jp/contests/abc395/tasks/abc395_a
// time: 2026-02-06 12:23:51 https://github.com/funcdfs


// #region main
package main; import ( "bufio"; "fmt"; "os"; "runtime"; "strings" ); var _in, _out = new(bufio.Reader), new(bufio.Writer)
func _github_funcdfs[T any](sep, end string, arr ...T) { for idx := range arr { fmt.Fprint(_out, arr[idx]); if idx == len(arr)-1 { fmt.Fprint(_out, end); } else { fmt.Fprint(_out, sep) } } }
func main() { _in = bufio.NewReader(os.Stdin); _out = bufio.NewWriter(os.Stdout); defer _out.Flush(); solve() }
func input      [T any] ()           T { var value T; fmt.Fscan(_in, &value); return value }
func inputSlice [T any] (size int) []T { data := make([]T, size); for idx := 0; idx < size; idx++ { data[idx] = input[T](); }; return data }
func print      [T any] (arr ...T)     { _github_funcdfs("", "", arr...) }
func println    [T any] (arr ...T)     { _github_funcdfs(" ", "\n", arr...) }
func dbg(args ...any) { _, f, l, _ := runtime.Caller(1); fmt.Fprintf(os.Stderr, "L%d: ", l); msg := ""; if f, err := os.Open(f); err == nil { defer f.Close(); s := bufio.NewScanner(f); for i := 1; i <= l; i++ { s.Scan() }; msg = s.Text(); if i := strings.Index(msg, "dbg("); i >= 0 { msg = msg[i+4:]; if i := strings.LastIndex(msg, ")"); i >= 0 { msg = msg[:i] } } }; names := strings.Split(msg, ","); for i, v := range args { n := ""; if i < len(names) { n = strings.TrimSpace(names[i]) }; if n != "" { fmt.Fprintf(os.Stderr, "[%s]={%v} ", n, v) } else { fmt.Fprintf(os.Stderr, "{%v} ", v) } }; fmt.Fprintln(os.Stderr) }
// #endregion main


// ----------------------------- /* Start of useful functions */ -----------------------------

func solve() {

	n := input[int]()
	a := inputSlice[int](n)

	// check a is sorted from small to large
	for i := 0; i < n-1; i++ {
		if a[i] >= a[i+1] {
			println("No")
			return
		}
	}
	println("Yes")

}

// ----------------------------- /* End of useful functions */ -------------------------------