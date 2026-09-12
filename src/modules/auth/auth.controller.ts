import { Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { JwtGuard } from "./auth.guard";

@Controller("auth")
export class AuthController {
  constructor(private auth: AuthService) {}
  @Post("login") login(@Body() d: LoginDto) {
    return this.auth.login(d);
  }
  @Post("logout") logout() {
    return { success: true };
  }
  @UseGuards(JwtGuard)
  @Get("me") me(@Req() req: any) {
    return req.user
      ? {
          id: req.user.id,
          email: req.user.email,
          name: req.user.name,
          systemRole: req.user.systemRole,
        }
      : null;
  }
}
