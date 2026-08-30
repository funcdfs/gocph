import { describe, expect, it } from 'vitest';
import { matchRegionPairs } from './regionMatcher';

describe('matchRegionPairs', () => {
    it('识别模板骨架的 #region main', () => {
        const lines = [
            '// #region main',
            'package main',
            'func main() {}',
            '// #endregion main',
            '',
            'func solve() {}',
        ];
        expect(matchRegionPairs(lines)).toEqual([{ start: 0, end: 3 }]);
    });

    it('兼容不带 # 与任意空白的写法', () => {
        const lines = [
            '  //  region helpers',
            'var x = 1',
            '\t// endregion',
        ];
        expect(matchRegionPairs(lines)).toEqual([{ start: 0, end: 2 }]);
    });

    it('支持嵌套 region，内层先闭合', () => {
        const lines = [
            '// #region outer',
            '// #region inner',
            'code',
            '// #endregion inner',
            '// #endregion outer',
        ];
        expect(matchRegionPairs(lines)).toEqual([
            { start: 1, end: 3 },
            { start: 0, end: 4 },
        ]);
    });

    it('忽略未闭合的 start 与多余的 end', () => {
        expect(matchRegionPairs(['// #region only-start', 'code'])).toEqual([]);
        expect(matchRegionPairs(['code', '// #endregion stray'])).toEqual([]);
    });

    it('不把普通注释或代码误判为 region', () => {
        const lines = [
            '// regionalSettings 相关说明',
            'regionStart := 1',
            '// this line mentions endregion later',
        ];
        expect(matchRegionPairs(lines)).toEqual([]);
    });
});
