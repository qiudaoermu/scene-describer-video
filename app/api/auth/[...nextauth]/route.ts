import NextAuth, { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import GitHubProvider from "next-auth/providers/github";
import TwitterProvider from "next-auth/providers/twitter";
import GitlabProvider from "next-auth/providers/gitlab";

import type { Session, User } from 'next-auth'
// 简化配置，暂时不使用MongoDB适配器以避免版本兼容性问题

// 根据环境动态配置OAuth提供商
const getProviders = () => {
  const providers = [];
  
  // GitHub - 开发和生产环境都支持
  
  
  // Google - 生产环境或有配置时启用
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    providers.push(
      GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        httpOptions: {
          timeout: 50000,
        },
      })
    );
  }
  
  // GitLab - 仅在生产环境或明确配置时启用
  if (
    process.env.NODE_ENV === "production"
  ) {
    // 生产环境下，使用生产环境的GitLab配置
    providers.push(
      GitlabProvider({
        clientId: process.env.GITLAB_ID_PROD!,
        clientSecret: process.env.GITLAB_SECRET_PROD!,
        httpOptions: {
          timeout: 50000,
        },
      })
    );
    // 生产环境下，也添加开发环境的GitHub配置
    providers.push(
      GitHubProvider({
        clientId: process.env.GITHUB_CLIENT_ID_PROD!,
        clientSecret: process.env.GITHUB_CLIENT_SECRET_PROD!,
        allowDangerousEmailAccountLinking: true,
        httpOptions: {
          timeout: 50000,
        },
      })
    );
  } else {

    providers.push(
      GitHubProvider({
        clientId: process.env.GITHUB_CLIENT_ID!,
        clientSecret: process.env.GITHUB_CLIENT_SECRET!,
        allowDangerousEmailAccountLinking: true,
        httpOptions: {
          timeout: 50000,
        },
      })
    );


    providers.push(
      GitlabProvider({
        clientId: process.env.GITLAB_ID!,
        clientSecret: process.env.GITLAB_SECRET!,
        httpOptions: {
          timeout: 50000,
        },
      })
    );
  }
  
  
  // Twitter - 仅在生产环境或明确配置时启用
  if  (process.env.TWITTER_ID && process.env.TWITTER_SECRET) {
    providers.push(
      TwitterProvider({
        clientId: process.env.TWITTER_ID,
        clientSecret: process.env.TWITTER_SECRET,
        client: {
          httpOptions: {
            timeout: 20000,
          },
        },
        version: "2.0",
        authorization: {
          params: {
            scope: "tweet.read users.read follows.read offline.access",
          },
        },
        profile(profile: { data?: { id: string; name: string; username: string; profile_image_url: string }; id?: string; name?: string; username?: string; profile_image_url?: string }) {
            return {
              id: profile.data?.id || profile.id || '',
              name: profile.data?.name || profile.name || '',
              screen_name: profile.data?.username || profile.username || '',
              image: profile.data?.profile_image_url || profile.profile_image_url || '',
            };
          },
      })
    );
  }
  
  return providers;
};

export const authOptions: NextAuthOptions = {
  providers: getProviders(),
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