import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { insertUserSchema } from "@shared/schema";
import { Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { z } from "zod";

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const [, setLocation] = useLocation();

  if (user) {
    setLocation("/");
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex">
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Document Management System</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <LoginForm />
              </TabsContent>

              <TabsContent value="register">
                <RegisterForm />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <div className="hidden lg:flex flex-1 bg-primary items-center justify-center p-12">
        <div className="max-w-2xl text-primary-foreground">
          <h1 className="text-4xl font-bold mb-6">
            Secure Document Management & Sharing
          </h1>
          <p className="text-lg opacity-90">
            Upload, manage and securely share your documents using QR codes. Control access
            and track document requests in real-time.
          </p>
        </div>
      </div>
    </div>
  );
}

function LoginForm() {
  const { loginMutation } = useAuth();
  const form = useForm({
    resolver: zodResolver(insertUserSchema.pick({ email: true, password: true })),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((data) => loginMutation.mutate(data))}
        className="space-y-4 mt-4"
      >
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" {...field} />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input type="password" {...field} />
              </FormControl>
            </FormItem>
          )}
        />

        <Button
          type="submit"
          className="w-full"
          disabled={loginMutation.isPending}
        >
          {loginMutation.isPending && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          Login
        </Button>
      </form>
    </Form>
  );
}

function RegisterForm() {
  const { registerMutation } = useAuth();
  const form = useForm({
    resolver: zodResolver(
      insertUserSchema.extend({
        confirmPassword: z.string(),
        confirmPin: z.string(),
      }).refine((data) => {
        const isPasswordMatch = data.password === data.confirmPassword;
        const isPinMatch = data.pin === data.confirmPin;
        if (!isPasswordMatch) {
          return { message: "Passwords don't match", path: ["confirmPassword"] };
        }
        if (!isPinMatch) {
          return { message: "PINs don't match", path: ["confirmPin"] };
        }
        return true;
      }),
    ),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      pin: "",
      confirmPin: "",
    },
  });

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((data) => {
          const { confirmPassword, confirmPin, ...registerData } = data;
          registerMutation.mutate(registerData);
        })}
        className="space-y-4 mt-4"
      >
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" {...field} />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input type="password" {...field} />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirm Password</FormLabel>
              <FormControl>
                <Input type="password" {...field} />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="pin"
          render={({ field }) => (
            <FormItem>
              <FormLabel>PIN (6 digits)</FormLabel>
              <FormControl>
                <Input type="password" maxLength={6} {...field} />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="confirmPin"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirm PIN</FormLabel>
              <FormControl>
                <Input type="password" maxLength={6} {...field} />
              </FormControl>
            </FormItem>
          )}
        />

        <Button
          type="submit"
          className="w-full"
          disabled={registerMutation.isPending}
        >
          {registerMutation.isPending && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          Register
        </Button>
      </form>
    </Form>
  );
}