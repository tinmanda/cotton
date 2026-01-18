import React from "react";
import { Pressable, PressableProps, Text, View } from "react-native";

interface ButtonProps extends PressableProps {
  title: string;
  variant?: "primary" | "outline" | "secondary";
  icon?: React.ReactNode;
  className?: string;
}

export function Button({
  title,
  variant = "primary",
  icon,
  className = "",
  ...pressableProps
}: ButtonProps) {
  let buttonStyles =
    "w-full p-4 rounded-lg flex-row items-center justify-center ";
  let textStyles = "font-semibold text-lg text-center ";

  if (variant === "primary") {
    buttonStyles += "bg-primary";
    textStyles += "text-white";
  } else if (variant === "outline") {
    buttonStyles += "border border-primary bg-transparent";
    textStyles += "text-primary";
  } else if (variant === "secondary") {
    buttonStyles += "bg-gray-100";
    textStyles += "text-gray-900";
  }

  return (
    <Pressable
      className={`${buttonStyles} ${className} active:opacity-80`}
      {...pressableProps}
    >
      <View className="flex-row items-center justify-center">
        {icon && <View className="mr-2">{icon}</View>}
        <Text className={textStyles}>{title}</Text>
      </View>
    </Pressable>
  );
}
