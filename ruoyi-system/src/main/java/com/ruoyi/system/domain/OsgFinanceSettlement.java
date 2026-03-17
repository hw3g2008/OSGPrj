package com.ruoyi.system.domain;

import java.math.BigDecimal;
import java.util.Date;
import org.apache.commons.lang3.builder.ToStringBuilder;
import org.apache.commons.lang3.builder.ToStringStyle;
import com.ruoyi.common.core.domain.BaseEntity;

public class OsgFinanceSettlement extends BaseEntity
{
    private static final long serialVersionUID = 1L;

    private Long settlementId;
    private Long recordId;
    private String paymentStatus;
    private BigDecimal dueAmount;
    private BigDecimal paidAmount;
    private Date paymentDate;
    private String bankReferenceNo;
    private String paymentRemark;

    public Long getSettlementId()
    {
        return settlementId;
    }

    public void setSettlementId(Long settlementId)
    {
        this.settlementId = settlementId;
    }

    public Long getRecordId()
    {
        return recordId;
    }

    public void setRecordId(Long recordId)
    {
        this.recordId = recordId;
    }

    public String getPaymentStatus()
    {
        return paymentStatus;
    }

    public void setPaymentStatus(String paymentStatus)
    {
        this.paymentStatus = paymentStatus;
    }

    public BigDecimal getDueAmount()
    {
        return dueAmount;
    }

    public void setDueAmount(BigDecimal dueAmount)
    {
        this.dueAmount = dueAmount;
    }

    public BigDecimal getPaidAmount()
    {
        return paidAmount;
    }

    public void setPaidAmount(BigDecimal paidAmount)
    {
        this.paidAmount = paidAmount;
    }

    public Date getPaymentDate()
    {
        return paymentDate;
    }

    public void setPaymentDate(Date paymentDate)
    {
        this.paymentDate = paymentDate;
    }

    public String getBankReferenceNo()
    {
        return bankReferenceNo;
    }

    public void setBankReferenceNo(String bankReferenceNo)
    {
        this.bankReferenceNo = bankReferenceNo;
    }

    public String getPaymentRemark()
    {
        return paymentRemark;
    }

    public void setPaymentRemark(String paymentRemark)
    {
        this.paymentRemark = paymentRemark;
    }

    @Override
    public String toString()
    {
        return new ToStringBuilder(this, ToStringStyle.MULTI_LINE_STYLE)
            .append("settlementId", getSettlementId())
            .append("recordId", getRecordId())
            .append("paymentStatus", getPaymentStatus())
            .append("dueAmount", getDueAmount())
            .append("paidAmount", getPaidAmount())
            .append("paymentDate", getPaymentDate())
            .append("bankReferenceNo", getBankReferenceNo())
            .append("paymentRemark", getPaymentRemark())
            .append("createBy", getCreateBy())
            .append("createTime", getCreateTime())
            .append("updateBy", getUpdateBy())
            .append("updateTime", getUpdateTime())
            .append("remark", getRemark())
            .toString();
    }
}
