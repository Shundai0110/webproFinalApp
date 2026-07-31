import { AppError } from "../errors/AppError.js";

type ApprovalState = {
  buyerId: number;
  sellerId: number;
  buyerApproved: boolean;
  sellerApproved: boolean;
};

function participantRole(transaction: ApprovalState, currentUserId: number) {
  if (transaction.buyerId === currentUserId) return "buyer";
  if (transaction.sellerId === currentUserId) return "seller";
  throw new AppError(403, "FORBIDDEN", "購入者または出品者だけが承認を変更できます");
}

export function nextApprovalState(transaction: ApprovalState, currentUserId: number) {
  const role = participantRole(transaction, currentUserId);
  const isBuyer = role === "buyer";
  const isSeller = role === "seller";
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

export function revokedApprovalState(transaction: ApprovalState, currentUserId: number) {
  const role = participantRole(transaction, currentUserId);
  const isBuyer = role === "buyer";
  if ((isBuyer && !transaction.buyerApproved) || (!isBuyer && !transaction.sellerApproved)) {
    throw new AppError(409, "APPROVAL_NOT_FOUND", "このアカウントの承認は取り消し済みです");
  }
  return {
    buyerApproved: isBuyer ? false : transaction.buyerApproved,
    sellerApproved: isBuyer ? transaction.sellerApproved : false,
  };
}

export function assertBuyerCanCancelPurchase(
  transaction: Pick<ApprovalState, "buyerId">,
  currentUserId: number,
) {
  if (transaction.buyerId !== currentUserId) {
    throw new AppError(
      403,
      "FORBIDDEN",
      "購入者だけが購入申請を取り消せます",
    );
  }
}
