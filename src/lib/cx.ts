type MaybeClassname = string | boolean | null | undefined;

function cx(...args: MaybeClassname[]): string {
  return args.filter((a) => a).join(" ");
}

export default cx;
