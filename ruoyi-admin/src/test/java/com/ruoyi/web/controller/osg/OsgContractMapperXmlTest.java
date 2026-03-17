package com.ruoyi.web.controller.osg;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;

import java.nio.file.Path;

import javax.xml.parsers.DocumentBuilderFactory;

import org.junit.jupiter.api.Test;
import org.xml.sax.EntityResolver;
import org.xml.sax.InputSource;

class OsgContractMapperXmlTest
{
    @Test
    void contractMapperXmlShouldBeWellFormed()
    {
        Path mapperPath = Path.of("..", "ruoyi-system", "src", "main", "resources", "mapper", "system", "OsgContractMapper.xml");

        assertDoesNotThrow(() -> {
            DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
            factory.setFeature("http://apache.org/xml/features/nonvalidating/load-external-dtd", false);
            factory.setFeature("http://xml.org/sax/features/validation", false);
            var builder = factory.newDocumentBuilder();
            builder.setEntityResolver(emptyEntityResolver());
            builder.parse(mapperPath.toFile());
        });
    }

    private EntityResolver emptyEntityResolver()
    {
        return (publicId, systemId) -> new InputSource(new java.io.StringReader(""));
    }
}
