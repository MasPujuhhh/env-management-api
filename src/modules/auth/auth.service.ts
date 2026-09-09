import {
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../database/prisma.service";
import { LoginDto } from "./dto/login.dto";

function expiryInSeconds(value: string | undefined): number {
  const match = /^(\d+)\s*([smhd])$/.exec(value || "15m");
  if (!match) return 900;
  const amount = Number(match[1]);
  return (
    amount *
    { s: 1, m: 60, h: 3600, d: 86400 }[match[2] as "s" | "m" | "h" | "d"]
  );
}

@Injectable()
export class AuthService {
  constructor(
    private db: PrismaService,
    private jwt: JwtService,
  ) {}
  async login(d: LoginDto) {
    const u = await this.db.user.findFirst({
      where: { email: d.email.toLowerCase() },
    });
    if (!u || u.deletedAt || !(await bcrypt.compare(d.password, u.password)))
      throw new UnauthorizedException("Invalid credentials");
    return {
      accessToken: this.jwt.sign(
        { sub: u.id, email: u.email },
        {
          secret: process.env.JWT_SECRET,
          expiresIn: expiryInSeconds(process.env.JWT_EXPIRES_IN),
        },
      ),
    };
  }
}
