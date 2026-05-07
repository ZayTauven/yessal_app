import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

export const Storage = {
  async setItemAsync(key: string, value: string) {
    if (Platform.OS === "web") {
      try {
        if (typeof localStorage !== "undefined") {
          localStorage.setItem(key, value);
        }
      } catch (e) {
        console.error("Local storage is unavailable:", e);
      }
    } else {
      await SecureStore.setItemAsync(key, value);
    }
  },

  async getItemAsync(key: string) {
    if (Platform.OS === "web") {
      try {
        if (typeof localStorage !== "undefined") {
          return localStorage.getItem(key);
        }
      } catch (e) {
        console.error("Local storage is unavailable:", e);
      }
      return null;
    } else {
      return await SecureStore.getItemAsync(key);
    }
  },

  async deleteItemAsync(key: string) {
    if (Platform.OS === "web") {
      try {
        if (typeof localStorage !== "undefined") {
          localStorage.removeItem(key);
        }
      } catch (e) {
        console.error("Local storage is unavailable:", e);
      }
    } else {
      await SecureStore.deleteItemAsync(key);
    }
  },
};
