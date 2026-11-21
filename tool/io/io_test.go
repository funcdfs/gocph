package io

import (
	"bytes"
	"fmt"
	"os"
	"testing"
)

func TestSetIO(t *testing.T) {
	r, w, _ := os.Pipe()
	var out bytes.Buffer
	SetIO(r, &out)
	defer SetIO(os.Stdin, os.Stdout)

	go func() {
		defer w.Close()
		fmt.Fprint(w, "3 1 2 3\n")
	}()

	Input[int]() // n
	got := InputSlice[int](3)
	Pln(got...)

	if out.String() != "1 2 3\n" {
		t.Errorf("Pln output = %q, want %q", out.String(), "1 2 3\n")
	}
}
