// Owner request ("give the registration pages life"): the current stage's number, huge and faint, behind the step
// title on its color band, like a poster number. Decorative: the progress bar already says which stage this is.
export function StageNumeral({ n }: { n: string }) {
  return (
    <span aria-hidden="true" className="stage-numeral font-display text-[clamp(7rem,36vw,13rem)] leading-[0.8]">
      {n}
    </span>
  );
}
