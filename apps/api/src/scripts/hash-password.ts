// Prints an argon2id hash for a password, same policy and parameters as the
// api (Password.parse + Argon2PasswordHasher). The password is read from a
// hidden prompt, or from stdin when piped, never from argv (shell history).
//
//   make hash-password
//   printf %s 'secret123' | make hash-password
import { Password } from "../users/domain/password.js";
import { Argon2PasswordHasher } from "../users/infrastructure/argon2-password-hasher.js";

async function readPiped(): Promise<string> {
  let input = "";
  for await (const chunk of process.stdin) {
    input += chunk;
  }
  return input.replace(/\r?\n$/, "");
}

function readHidden(prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const stdin = process.stdin;
    let input = "";
    process.stderr.write(prompt);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    const onData = (key: string) => {
      for (const ch of key) {
        if (ch === "\r" || ch === "\n") {
          stdin.setRawMode(false);
          stdin.pause();
          stdin.off("data", onData);
          process.stderr.write("\n");
          return resolve(input);
        }
        if (ch === "\u0003") {
          stdin.setRawMode(false);
          process.stderr.write("\n");
          return reject(new Error("Cancelled"));
        }
        if (ch === "\u007f" || ch === "\b") {
          input = input.slice(0, -1);
        } else {
          input += ch;
        }
      }
    };
    stdin.on("data", onData);
  });
}

async function main(): Promise<void> {
  let raw: string;
  if (process.stdin.isTTY) {
    raw = await readHidden("Password: ");
    if ((await readHidden("Again: ")) !== raw) {
      throw new Error("Passwords do not match");
    }
  } else {
    raw = await readPiped();
  }
  // Throws WeakPasswordError outside 8..256 characters
  const password = Password.parse(raw);
  process.stdout.write(`${await new Argon2PasswordHasher().hash(password)}\n`);
}

main().catch((err: unknown) => {
  process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
