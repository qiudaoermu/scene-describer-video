import NextAuth, { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import GitHubProvider from "next-auth/providers/github";
import TwitterProvider from "next-auth/providers/twitter";
import GitlabProvider from "next-auth/providers/gitlab";

import type { Session, User } from 'next-auth'
// 简化配置，暂时不使用MongoDB适配器以避免版本兼容性问题

export const authOptions: NextAuthOptions = {
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
      httpOptions: {
        timeout: 50000, // 增加超时时间到50秒
      },
    }),
    GitlabProvider({
      clientId: process.env.GITLAB_ID!,
      clientSecret: process.env.GITLAB_SECRET!,
      httpOptions: {
        timeout: 50000, // 将超时时间增加到 10 秒
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      httpOptions: {
        timeout: 50000, // 将超时时间增加到 10 秒
      },
    }),
    TwitterProvider({
      clientId: process.env.TWITTER_ID!,
      clientSecret: process.env.TWITTER_SECRET!,
      client: {
        httpOptions: {
          timeout: 20000, // 若终端里有超时报错，则延长超时时间
        },
      },
      version: "2.0", // 重要
      authorization: {
        params: {
          scope: "tweet.read users.read follows.read offline.access", // 访问权限
        },
      },
      profile(profile) {
        // 这一步是为了拿到twitter更详细的用户信息，否则下面的session只能取到name，而取不到username
        return {
          id: profile.data.id,
          name: profile.data.name,
          screen_name: profile.data.username,
          image: profile.data.profile_image_url,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      // 在JWT中保存用户信息
      if (account && profile) {
        token.id = profile.sub || account.providerAccountId;
        token.email = profile.email;
        token.name = profile.name;
      }
      return token;
    },
    async session({ session, token }) {
      // 从JWT token中获取用户信息并添加到session
      if (token && session.user) {
        const extendedUser = session.user as Session["user"] & { id: string };
        extendedUser.id = token.id as string;
        extendedUser.email = token.email as string;
        extendedUser.name = token.name as string;
      }
      return session;
    },
  },
  // 增加请求超时时间

  // 使用NextAuth默认页面
  session: {
    strategy: "jwt",
  },
};

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }