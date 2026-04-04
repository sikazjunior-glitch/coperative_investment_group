from django.conf import settings
from django.db import models
from django.contrib.auth.models import AbstractUser
from django.core.exceptions import ValidationError
from django.utils import timezone

class User(AbstractUser):
    phone_number = models.CharField(max_length=15, blank=True, null=True)
    is_approved_member = models.BooleanField(default=False)

    def __str__(self):
        return self.username

class ClubSettings(models.Model):
    current_share_price = models.DecimalField(max_digits=10, decimal_places=2, default=10000.00)
    max_shares = models.PositiveIntegerField(default=100)
    max_members = models.PositiveIntegerField(default=10)
    
    class Meta:
        verbose_name_plural = "Club Settings"

    def save(self, *args, **kwargs):
        if not self.pk and ClubSettings.objects.exists():
            raise ValidationError('There can be only one ClubSettings instance')
        return super(ClubSettings, self).save(*args, **kwargs)

    def __str__(self):
        return f"Settings (Price: K{self.current_share_price})"

class Project(models.Model):
    STATUS_CHOICES = (
        ('PROPOSED', 'Proposed'),
        ('ACTIVE', 'Active'),
        ('COMPLETED', 'Completed'),
    )
    name = models.CharField(max_length=100)
    description = models.TextField()
    start_date = models.DateField(auto_now_add=True)
    capital_invested = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PROPOSED')

    def __str__(self):
        return self.name

from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone

class Transaction(models.Model):
    TRANSACTION_TYPES = (
        ('DEPOSIT', 'Cash Deposit'),
        ('BUY_SHARE', 'Buy Shares from Club'),
        ('SELL_SHARE', 'Sell Shares to Club'),
        ('TRANSFER', 'Transfer Equity'),
    )
    
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('APPROVED', 'Approved'),
        ('DECLINED', 'Declined'),
    ]
    
    # ---> THIS IS THE CRITICAL CHANGE RIGHT HERE <---
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    recipient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, null=True, blank=True, related_name='received_transfers')
    
    transaction_type = models.CharField(max_length=20, choices=TRANSACTION_TYPES)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    shares_involved = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    timestamp = models.DateTimeField(default=timezone.now)
    status = models.CharField(
        max_length=10, 
        choices=STATUS_CHOICES, 
        default='APPROVED'
    )

    def __str__(self):
        return f"{self.user.username} - {self.transaction_type} - {self.amount}"