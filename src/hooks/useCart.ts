'use client'

import { useCart as useCartContext } from '@/contexts/CartContext';
import { Product } from '@/types';
import { useToast } from '@/hooks/use-toast';

export function useCart() {
  const cart = useCartContext();
  const { toast } = useToast();

  const addToCartWithToast = async (product: Product, quantity: number = 1, weightInGrams?: number) => {
    // Check inventory before adding to cart
    try {
      const isWeightBased = product.stockManagementType === 'weight';
      
      const response = await fetch('/api/inventory/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId: product.id,
          variantId: product.variantId || null,
          requestedQuantity: !isWeightBased ? quantity : undefined,
          requestedWeight: isWeightBased ? (weightInGrams || quantity) : undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        toast({
          title: "Error",
          description: result.error || "Failed to check inventory",
          variant: "destructive",
          duration: 3000,
        });
        return;
      }

      if (!result.available) {
        const message = isWeightBased
          ? result.message || `Only ${result.availableWeight}g available`
          : result.message || `Only ${result.availableQuantity} units available`;
        
        toast({
          title: "Insufficient stock",
          description: message,
          variant: "destructive",
          duration: 3000,
        });
        return;
      }

      // Get current quantity/weight in cart
      const existingItem = cart.state.items.find(item => 
        item.product.id === product.id && 
        (!product.variantId || item.product.variantId === product.variantId)
      );
      const currentQuantityInCart = existingItem?.quantity || 0;
      const currentWeightInCart = existingItem?.numericValue || 0;

      if (isWeightBased) {
        // For weight-based products, check against the total weight (numericValue)
        const requestedWeight = weightInGrams || quantity;
        const totalRequestedWeight = (currentQuantityInCart * currentWeightInCart) + requestedWeight;
        
        if (result.stockManagementEnabled && totalRequestedWeight > result.availableWeight) {
          const canAdd = result.availableWeight - (currentQuantityInCart * currentWeightInCart);
          if (canAdd > 0) {
            toast({
              title: "Limited stock",
              description: `Only ${canAdd.toFixed(0)}g more can be added (${result.availableWeight.toFixed(0)}g total available, ${(currentQuantityInCart * currentWeightInCart).toFixed(0)}g already in cart)`,
              variant: "destructive",
              duration: 4000,
            });
          } else {
            toast({
              title: "Already at maximum",
              description: `You already have the maximum available weight (${(currentQuantityInCart * currentWeightInCart).toFixed(0)}g) in your cart`,
              variant: "destructive",
              duration: 3000,
            });
          }
          return;
        }
      } else {
        // For quantity-based products
        const totalRequestedQuantity = currentQuantityInCart + quantity;
        
        if (result.stockManagementEnabled && totalRequestedQuantity > result.availableQuantity) {
          const canAdd = result.availableQuantity - currentQuantityInCart;
          if (canAdd > 0) {
            toast({
              title: "Limited stock",
              description: `Only ${canAdd} more units can be added (${result.availableQuantity} total available, ${currentQuantityInCart} already in cart)`,
              variant: "destructive",
              duration: 4000,
            });
          } else {
            toast({
              title: "Already at maximum",
              description: `You already have the maximum available quantity (${currentQuantityInCart}) in your cart`,
              variant: "destructive",
              duration: 3000,
            });
          }
          return;
        }
      }

      // Add to cart
      // For weight-based: quantity=1 (unit count), numericValue=weight in grams
      // For quantity-based: quantity=count, numericValue=undefined
      if (isWeightBased) {
        cart.addToCart(product, quantity, weightInGrams);
        console.log(`Added to cart: quantity=${quantity}, numericValue=${weightInGrams}`);
      } else {
        cart.addToCart(product, quantity);
      }
      
      toast({
        title: "Added to cart",
        description: `${product.name} has been added to your cart`,
        duration: 2000,
      });
    } catch (error) {
      console.error('Error checking inventory:', error);
      toast({
        title: "Error",
        description: "Failed to add item to cart. Please try again.",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  const removeFromCartWithToast = (productId: string, productName?: string) => {
    cart.removeFromCart(productId);
    
    toast({
      title: "Removed from cart",
      description: productName ? `${productName} has been removed from your cart` : "Item removed from cart",
      duration: 2000,
    });
  };

  const updateQuantityWithToast = (productId: string, quantity: number, productName?: string) => {
    const oldQuantity = cart.state.items.find(item => item.product.id === productId)?.quantity || 0;
    cart.updateQuantity(productId, quantity);
    
    if (quantity === 0) {
      toast({
        title: "Removed from cart",
        description: productName ? `${productName} has been removed from your cart` : "Item removed from cart",
        duration: 2000,
      });
    } else if (quantity > oldQuantity) {
      toast({
        title: "Quantity updated",
        description: `Increased quantity to ${quantity}`,
        duration: 1500,
      });
    } else if (quantity < oldQuantity) {
      toast({
        title: "Quantity updated", 
        description: `Decreased quantity to ${quantity}`,
        duration: 1500,
      });
    }
  };

  const clearCartWithToast = () => {
    const itemCount = cart.state.itemCount;
    cart.clearCart();
    
    toast({
      title: "Cart cleared",
      description: `Removed ${itemCount} item${itemCount !== 1 ? 's' : ''} from your cart`,
      duration: 2000,
    });
  };

  const isInCart = (productId: string): boolean => {
    return cart.state.items.some(item => item.product.id === productId);
  };

  const getItemQuantity = (productId: string): number => {
    const item = cart.state.items.find(item => item.product.id === productId);
    return item?.quantity || 0;
  };

  const getItemSubtotal = (productId: string): number => {
    const item = cart.state.items.find(item => item.product.id === productId);
    return item ? item.product.price * item.quantity : 0;
  };

  const getCartSummary = () => {
    const subtotal = cart.state.total;
    const deliveryFee = subtotal > 0 ? 5.99 : 0;
    const tax = subtotal * 0.08;
    const total = subtotal + deliveryFee + tax;

    return {
      subtotal,
      deliveryFee,
      tax,
      total,
      itemCount: cart.state.itemCount,
    };
  };

  return {
    // Original cart context methods
    ...cart,
    // Enhanced methods with toast notifications
    addToCartWithToast,
    removeFromCartWithToast,
    updateQuantityWithToast,
    clearCartWithToast,
    // Utility methods
    isInCart,
    getItemQuantity,
    getItemSubtotal,
    getCartSummary,
  };
}