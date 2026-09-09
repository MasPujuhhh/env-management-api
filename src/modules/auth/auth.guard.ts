import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../database/prisma.service";

@Injectable()
export class JwtGuard implements CanActivate {
  constructor(
    private jwt: JwtService,
    private db: PrismaService,
  ) {}
  async canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest();
    const header = req.headers.authorization || "";
    if (!header || !/^Bearer\s+\S+$/i.test(header)) throw new UnauthorizedException("Authorization token is required");

    try {
      const token = this.jwt.verify(header.replace(/^Bearer\s+/i, ""), {
        secret: process.env.JWT_SECRET,
      });

      req.user = await this.db.user.findUnique({ where: { id: token.sub } });
      if (!req.user) throw new UnauthorizedException("User not found");
      return true;
    } catch {
      throw new UnauthorizedException("Invalid or expired authorization token");
    }
  }
}
