from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Sum
from .models import Project, Transaction, ClubSettings
from .serializers import UserSerializer, ProjectSerializer, TransactionSerializer
from decimal import Decimal

from django.contrib.auth import get_user_model
User = get_user_model()

class UserViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer

    # --- NEW: ADMIN USER APPROVAL ---
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        if not request.user.is_staff:
            return Response({"error": "Unauthorized. Admins only."}, status=status.HTTP_403_FORBIDDEN)
        
        target_user = self.get_object()
        target_user.is_approved_member = True
        target_user.save()
        
        return Response({"success": f"User #{target_user.id} has been granted official CIG access."}, status=status.HTTP_200_OK)
    

class ProjectViewSet(viewsets.ModelViewSet):
    queryset = Project.objects.all()
    serializer_class = ProjectSerializer

    @action(detail=True, methods=['post'])
    def fund(self, request, pk=None):
        if not request.user.is_staff:
            return Response({"error": "Unauthorized. Only admins can fund projects."}, status=status.HTTP_403_FORBIDDEN)
        
        project = self.get_object()
        
        try:
            amount_to_fund = float(request.data.get('amount', 0))
            if amount_to_fund <= 0:
                raise ValueError
        except (TypeError, ValueError):
            return Response({"error": "Please provide a valid amount."}, status=status.HTTP_400_BAD_REQUEST)

        # UPDATE: Only count APPROVED transactions for math
        bought = Transaction.objects.filter(transaction_type='BUY_SHARE', status='APPROVED').aggregate(Sum('amount'))['amount__sum'] or 0
        sold = Transaction.objects.filter(transaction_type='SELL_SHARE', status='APPROVED').aggregate(Sum('amount'))['amount__sum'] or 0
        total_cash_in = bought - sold

        money_in_projects = Project.objects.aggregate(Sum('capital_invested'))['capital_invested__sum'] or 0
        liquid_cash = total_cash_in - money_in_projects

        if amount_to_fund > liquid_cash:
            return Response({"error": f"Declined. The club only has K{liquid_cash} available."}, status=status.HTTP_400_BAD_REQUEST)

        project.capital_invested = float(project.capital_invested) + amount_to_fund
        project.save()

        return Response({
            "success": f"Successfully funded K{amount_to_fund} into {project.name}",
            "new_total": project.capital_invested
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def defund(self, request, pk=None):
        if not request.user.is_staff:
            return Response({"error": "Unauthorized. Only admins can return funds."}, status=status.HTTP_403_FORBIDDEN)
            
        project = self.get_object()
   
        try:
            amount_to_withdraw = float(request.data.get('amount', 0))
            if amount_to_withdraw <= 0:
                raise ValueError
        except (TypeError, ValueError):
            return Response({"error": "Please provide a valid amount."}, status=status.HTTP_400_BAD_REQUEST)

        if amount_to_withdraw > float(project.capital_invested):
            return Response({"error": f"Declined. The project only has K{project.capital_invested} to return."}, status=status.HTTP_400_BAD_REQUEST)

        project.capital_invested = float(project.capital_invested) - amount_to_withdraw
        project.save()

        return Response({
            "success": f"Successfully returned K{amount_to_withdraw} to the Vault.",
            "new_total": project.capital_invested
        }, status=status.HTTP_200_OK)


class TransactionViewSet(viewsets.ModelViewSet):
    queryset = Transaction.objects.all().order_by('-timestamp')
    serializer_class = TransactionSerializer
    permission_classes = [IsAuthenticated]

    def destroy(self, request, *args, **kwargs):
        if not request.user.is_staff:
            return Response({"error": "Only admins can void transactions."}, status=status.HTTP_403_FORBIDDEN)
        return super().destroy(request, *args, **kwargs)

    # --- NEW: ADMIN APPROVE ---
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        if not request.user.is_staff:
            return Response({"error": "Unauthorized."}, status=status.HTTP_403_FORBIDDEN)
        
        transaction = self.get_object()
        if transaction.status != 'PENDING':
            return Response({"error": "Can only approve pending transactions."}, status=status.HTTP_400_BAD_REQUEST)
            
        transaction.status = 'APPROVED'
        transaction.save()
        return Response({"success": "Share purchase approved! Cash is now in the vault."}, status=status.HTTP_200_OK)

    # --- NEW: ADMIN DECLINE ---
    @action(detail=True, methods=['post'])
    def decline(self, request, pk=None):
        if not request.user.is_staff:
            return Response({"error": "Unauthorized."}, status=status.HTTP_403_FORBIDDEN)
            
        transaction = self.get_object()
        if transaction.status != 'PENDING':
            return Response({"error": "Can only decline pending transactions."}, status=status.HTTP_400_BAD_REQUEST)
            
        transaction.status = 'DECLINED'
        transaction.save()
        return Response({"success": "Request declined."}, status=status.HTTP_200_OK)
            
    # --- BUY SHARES (MAKER) ---
    @action(detail=False, methods=['post'])
    def buy_shares(self, request):
        user = request.user
        
        if not user.is_approved_member:
            return Response({"error": "You are not an approved member yet."}, status=status.HTTP_403_FORBIDDEN)

        try:
            shares_to_buy = int(request.data.get('shares', 0))
            if shares_to_buy <= 0:
                raise ValueError
        except (TypeError, ValueError):
            return Response({"error": "Please provide a valid number of shares."}, status=status.HTTP_400_BAD_REQUEST)

        settings_obj = ClubSettings.objects.first()
        if not settings_obj:
            return Response({"error": "Club settings not configured."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # UPDATE: Only count APPROVED shares to see how many are left
        bought = Transaction.objects.filter(transaction_type='BUY_SHARE', status='APPROVED').aggregate(Sum('shares_involved'))['shares_involved__sum'] or 0
        sold = Transaction.objects.filter(transaction_type='SELL_SHARE', status='APPROVED').aggregate(Sum('shares_involved'))['shares_involved__sum'] or 0
        active_shares = bought - sold

        if active_shares + shares_to_buy > settings_obj.max_shares:
            shares_left = settings_obj.max_shares - active_shares
            return Response({"error": f"Cannot buy {shares_to_buy} shares. Only {shares_left} shares remaining."}, status=status.HTTP_400_BAD_REQUEST)

        total_cost = shares_to_buy * settings_obj.current_share_price
        
        # UPDATE: Mark as PENDING
        transaction = Transaction.objects.create(
            user=user,
            transaction_type='BUY_SHARE',
            amount=total_cost, 
            shares_involved=shares_to_buy,
            status='PENDING' # Maker-Checker Activated!
        )

        return Response({
            "success": f"Request submitted! Waiting for Admin to approve your K{total_cost:,.2f} transfer.",
            "total_cost": total_cost,
            "transaction_id": transaction.id
        }, status=status.HTTP_201_CREATED)
    
    # --- SELL SHARES (MAKER) ---
    @action(detail=False, methods=['post'])
    def sell_shares(self, request):
        user = request.user
        
        if not user.is_approved_member:
            return Response({"error": "You are not an approved member yet."}, status=status.HTTP_403_FORBIDDEN)

        try:
            shares_to_sell = int(request.data.get('shares', 0))
            if shares_to_sell <= 0:
                raise ValueError
        except (TypeError, ValueError):
            return Response({"error": "Please provide a valid number of shares."}, status=status.HTTP_400_BAD_REQUEST)

        # SAFETY CHECK: Calculate true available shares
        bought = Transaction.objects.filter(user=user, transaction_type='BUY_SHARE', status='APPROVED').aggregate(Sum('shares_involved'))['shares_involved__sum'] or 0
        sold = Transaction.objects.filter(user=user, transaction_type='SELL_SHARE', status='APPROVED').aggregate(Sum('shares_involved'))['shares_involved__sum'] or 0
        pending_sales = Transaction.objects.filter(user=user, transaction_type='SELL_SHARE', status='PENDING').aggregate(Sum('shares_involved'))['shares_involved__sum'] or 0
        
        available_shares = bought - sold - pending_sales

        if shares_to_sell > available_shares:
            return Response({"error": f"Declined. You only have {available_shares} free shares available to sell."}, status=status.HTTP_400_BAD_REQUEST)

        settings_obj = ClubSettings.objects.first()
        if not settings_obj:
            return Response({"error": "Club settings not configured."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        total_payout = shares_to_sell * settings_obj.current_share_price
        
        # Mark as PENDING
        transaction = Transaction.objects.create(
            user=user,
            transaction_type='SELL_SHARE',
            amount=total_payout, 
            shares_involved=shares_to_sell,
            status='PENDING' # Maker-Checker Activated!
        )

        return Response({
            "success": f"Liquidation request submitted! Waiting for Admin to approve your K{total_payout:,.2f} payout.",
            "total_payout": total_payout,
            "transaction_id": transaction.id
        }, status=status.HTTP_201_CREATED)
    
    # --- TRANSFER EQUITY (P2P) ---
    @action(detail=False, methods=['post'])
    def transfer_shares(self, request):
        sender = request.user
        recipient_id = request.data.get('recipient_id')
        
        if not sender.is_approved_member:
            return Response({"error": "Unauthorized."}, status=status.HTTP_403_FORBIDDEN)

        try:
            shares_to_transfer = int(request.data.get('shares', 0))
            if shares_to_transfer <= 0 or not recipient_id:
                raise ValueError
        except (TypeError, ValueError):
            return Response({"error": "Provide valid shares and select a recipient."}, status=status.HTTP_400_BAD_REQUEST)

        if str(sender.id) == str(recipient_id):
            return Response({"error": "You cannot transfer shares to yourself."}, status=status.HTTP_400_BAD_REQUEST)

        # SAFETY CHECK: Calculate true available shares for the sender
        bought = Transaction.objects.filter(user=sender, transaction_type='BUY_SHARE', status='APPROVED').aggregate(Sum('shares_involved'))['shares_involved__sum'] or 0
        sold = Transaction.objects.filter(user=sender, transaction_type='SELL_SHARE', status='APPROVED').aggregate(Sum('shares_involved'))['shares_involved__sum'] or 0
        transferred_out = Transaction.objects.filter(user=sender, transaction_type='TRANSFER', status='APPROVED').aggregate(Sum('shares_involved'))['shares_involved__sum'] or 0
        transferred_in = Transaction.objects.filter(recipient=sender, transaction_type='TRANSFER', status='APPROVED').aggregate(Sum('shares_involved'))['shares_involved__sum'] or 0
        pending_sales = Transaction.objects.filter(user=sender, transaction_type__in=['SELL_SHARE', 'TRANSFER'], status='PENDING').aggregate(Sum('shares_involved'))['shares_involved__sum'] or 0
        
        available_shares = (bought + transferred_in) - (sold + transferred_out + pending_sales)

        if shares_to_transfer > available_shares:
            return Response({"error": f"Declined. You only have {available_shares} free shares available to transfer."}, status=status.HTTP_400_BAD_REQUEST)

        # Create the Pending Transfer Record (Amount is 0 because club cash isn't affected)
        transaction = Transaction.objects.create(
            user=sender,
            recipient_id=recipient_id,
            transaction_type='TRANSFER',
            amount=0.00, 
            shares_involved=shares_to_transfer,
            status='PENDING' 
        )

        return Response({"success": f"Transfer request for {shares_to_transfer} shares submitted to Admin for verification."}, status=status.HTTP_201_CREATED)

    # --- THE PAYOUT ENGINE ---
    @action(detail=False, methods=['post'])
    def distribute_dividend(self, request):
        if not request.user.is_staff:
            return Response({"error": "Only the Club Admin can distribute profits."}, status=status.HTTP_403_FORBIDDEN)

        try:
            total_profit = float(request.data.get('amount', 0))
            if total_profit <= 0:
                raise ValueError
        except (TypeError, ValueError):
            return Response({"error": "Please provide a valid profit amount."}, status=status.HTTP_400_BAD_REQUEST)

        # UPDATE: Only pay out on APPROVED shares
        bought = Transaction.objects.filter(transaction_type='BUY_SHARE', status='APPROVED').aggregate(Sum('shares_involved'))['shares_involved__sum'] or 0
        sold = Transaction.objects.filter(transaction_type='SELL_SHARE', status='APPROVED').aggregate(Sum('shares_involved'))['shares_involved__sum'] or 0
        total_shares = bought - sold

        if total_shares <= 0:
            return Response({"error": "Cannot distribute profits. No approved shares exist."}, status=status.HTTP_400_BAD_REQUEST)

        profit_per_share = Decimal(str(total_profit)) / total_shares
        users = User.objects.all()
        payout_count = 0

        for user in users:
            u_bought = Transaction.objects.filter(user=user, transaction_type='BUY_SHARE', status='APPROVED').aggregate(Sum('shares_involved'))['shares_involved__sum'] or 0
            u_sold = Transaction.objects.filter(user=user, transaction_type='SELL_SHARE', status='APPROVED').aggregate(Sum('shares_involved'))['shares_involved__sum'] or 0
            u_shares = u_bought - u_sold

            if u_shares > 0:
                user_payout = Decimal(str(u_shares)) * profit_per_share
                
                Transaction.objects.create(
                    user=user,
                    transaction_type='DIVIDEND', 
                    amount=user_payout,
                    shares_involved=0,
                    status='APPROVED' # Dividends are automatically approved
                )
                payout_count += 1

        return Response({
            "success": f"Successfully paid out K{total_profit:,.2f} across {total_shares} shares.",
            "profit_per_share": profit_per_share,
            "members_paid": payout_count
        }, status=status.HTTP_200_OK)

# --- IDENTITY ENDPOINT ---
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def current_user(request):
    return Response({
        "username": request.user.username,
        "first_name": request.user.first_name,
        "last_name": request.user.last_name,
        "is_admin": request.user.is_staff 
    })