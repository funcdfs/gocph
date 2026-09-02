import confetti from 'canvas-confetti';

/** 全部通过时的庆祝动画：五段不同扩散角度的粒子叠加 */
export function fireConfetti(): void {
    const count = 200;
    const defaults = { origin: { y: 0.7 }, ticks: 60, gravity: 1.2, decay: 0.92 };
    const fire = (ratio: number, opts: confetti.Options): void => {
        void confetti({ ...defaults, ...opts, particleCount: Math.floor(count * ratio) });
    };

    fire(0.25, { spread: 26, startVelocity: 55 });
    fire(0.2, { spread: 60 });
    fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
    fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
    fire(0.1, { spread: 120, startVelocity: 45 });
}
