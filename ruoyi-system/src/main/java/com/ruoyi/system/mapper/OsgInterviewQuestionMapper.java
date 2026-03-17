package com.ruoyi.system.mapper;

import java.util.List;
import com.ruoyi.system.domain.OsgInterviewQuestion;

public interface OsgInterviewQuestionMapper
{
    List<OsgInterviewQuestion> selectQuestionList(OsgInterviewQuestion query);

    OsgInterviewQuestion selectQuestionById(Long questionId);

    int updateQuestionReview(OsgInterviewQuestion row);

    int selectPendingQuestionCount();
}
