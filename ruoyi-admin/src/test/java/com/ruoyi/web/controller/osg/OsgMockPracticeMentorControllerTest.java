package com.ruoyi.web.controller.osg;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.common.utils.SecurityUtils;
import com.ruoyi.system.domain.OsgMockPractice;
import com.ruoyi.system.service.impl.OsgMockPracticeServiceImpl;

@ExtendWith(MockitoExtension.class)
class OsgMockPracticeMentorControllerTest
{
    @InjectMocks
    private OsgMockPracticeController controller;

    @Mock
    private OsgMockPracticeServiceImpl mockPracticeService;

    private MockedStatic<SecurityUtils> securityMock;

    @BeforeEach
    void setUp()
    {
        securityMock = Mockito.mockStatic(SecurityUtils.class);
        securityMock.when(SecurityUtils::getUserId).thenReturn(100L);
    }

    @AfterEach
    void tearDown()
    {
        securityMock.close();
    }

    @Test
    void confirmShouldMarkPracticeConfirmed()
    {
        when(mockPracticeService.confirmMentorMockPractice(any(OsgMockPractice.class))).thenReturn(1);

        AjaxResult result = controller.confirm(7L);

        assertEquals(200, result.get("code"));
        verify(mockPracticeService).confirmMentorMockPractice(any(OsgMockPractice.class));
    }
}
