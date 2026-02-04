# Java 代码规范

## 引用规范

阿里巴巴 Java 开发手册（泰山版）

## 命名规范

- 类名：UpperCamelCase
- 方法名：lowerCamelCase
- 常量：UPPER_SNAKE_CASE
- 包名：全小写

## 代码结构

### Controller

```java
@RestController
@RequestMapping("/api/xxx")
public class XxxController {
    
    @Autowired
    private IXxxService xxxService;
    
    @PostMapping
    public AjaxResult create(@RequestBody @Valid XxxDTO dto) {
        return xxxService.create(dto);
    }
}
```

### Service

```java
public interface IXxxService {
    AjaxResult create(XxxDTO dto);
}

@Service
public class XxxServiceImpl implements IXxxService {
    
    @Autowired
    private XxxMapper xxxMapper;
    
    @Override
    public AjaxResult create(XxxDTO dto) {
        // 业务逻辑
    }
}
```

### Mapper

```java
@Mapper
public interface XxxMapper extends BaseMapper<Xxx> {
    // 自定义方法
}
```

## 注释规范

- 类：必须有类注释
- 公共方法：必须有方法注释
- 复杂逻辑：必须有行内注释

## 异常处理

- 使用统一异常处理
- 业务异常使用 ServiceException
- 不要吞掉异常
