import { AppError } from "../errors/AppError.js";

type ApprovalState = {
  buyerId: number;
  sellerId: number;
  buyerApproved: boolean;
  sellerApproved: boolean;
};

export function nextApprovalState(transaction: ApprovalState, currentUserId: number) {
  const isBuyer = transaction.buyerId === currentUserId;
  const isSeller = transaction.sellerId === currentUserId;
  if (!isBuyer && !isSeller) {
    throw new AppError(403, "FORBIDDEN", "購入者または出品者だけが承諾できます");
  }
  if ((isBuyer && transaction.buyerApproved) || (isSeller && transaction.sellerApproved)) {
    throw new AppError(409, "ALREADY_APPROVED", "このアカウントはすでに承諾しています");
  }

  const buyerApproved = transaction.buyerApproved || isBuyer;
  const sellerApproved = transaction.sellerApproved || isSeller;
  return {
    buyerApproved,
    sellerApproved,
    shouldComplete: buyerApproved && sellerApproved,
  };
}
