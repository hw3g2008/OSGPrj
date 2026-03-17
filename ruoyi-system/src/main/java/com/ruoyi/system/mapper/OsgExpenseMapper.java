package com.ruoyi.system.mapper;

import java.util.List;
import com.ruoyi.system.domain.OsgExpense;

public interface OsgExpenseMapper
{
    List<OsgExpense> selectExpenseList(OsgExpense expense);

    OsgExpense selectExpenseByExpenseId(Long expenseId);

    int insertExpense(OsgExpense expense);

    int updateExpense(OsgExpense expense);
}
