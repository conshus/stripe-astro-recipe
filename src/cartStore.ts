import { atom, map } from "nanostores";

export const isCartOpen = atom(false);

export type CartItem = {
  id: string;
  name: string;
  price: string;
  imageSrc: string;
  quantity: number;
};

export type CartItemDisplayInfo = Pick<
  CartItem,
  "id" | "name" | "price" | "imageSrc"
>;

export const cartItems = map<Record<string, CartItem>>({});

function saveToLocalStorage(cartData) {
  console.log("saveToLocalStorage cartData: ", cartData);
  const cartDataString = JSON.stringify(cartData);

  // Store the string in localStorage using a key (e.g., 'shoppingCart')
  try {
    localStorage.setItem("shoppingCart", cartDataString);
    console.log("Cart data saved to localStorage.");
  } catch (e) {
    console.error("Error saving to localStorage:", e);
    // Handle potential errors, like storage being full or unavailable
  }
}

export function addCartItem({
  id,
  name,
  price,
  imageSrc,
}: CartItemDisplayInfo) {
  console.log("add cart item!");
  const existingEntry = cartItems.get()[id];
  if (existingEntry) {
    cartItems.setKey(id, {
      ...existingEntry,
      quantity: existingEntry.quantity + 1,
    });
  } else {
    cartItems.setKey(id, {
      id,
      name,
      price,
      imageSrc,
      quantity: 1,
    });
  }
  // save to localStorage
  saveToLocalStorage(Object.values(cartItems.get()));
}

export function increaseCartItem(id: string) {
  console.log("increase cart item!", id);
  const existingEntry = cartItems.get()[id];
  if (existingEntry) {
    cartItems.setKey(id, {
      ...existingEntry,
      quantity: existingEntry.quantity + 1,
    });
  }
  // save to localStorage
  saveToLocalStorage(Object.values(cartItems.get()));
}

export function decreaseCartItem(id: string) {
  console.log("decrease cart item!", id);
  const existingEntry = cartItems.get()[id];
  if (existingEntry) {
    cartItems.setKey(id, {
      ...existingEntry,
      quantity: existingEntry.quantity - 1,
    });
  }
  if (cartItems.get()[id].quantity === 0) {
    // document.querySelector(`#${existingEntry.id}`).remove();
    cartItems.setKey(id, undefined);
  }
  // save to localStorage
  saveToLocalStorage(Object.values(cartItems.get()));
}
