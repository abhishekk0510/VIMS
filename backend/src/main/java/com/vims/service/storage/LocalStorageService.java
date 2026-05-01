package com.vims.service.storage;

import com.vims.exception.BusinessException;
import com.vims.exception.ResourceNotFoundException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.*;
import java.util.UUID;

@Service
@ConditionalOnProperty(name = "file.storage.type", havingValue = "local", matchIfMissing = true)
@Slf4j
public class LocalStorageService implements StorageService {

    @Value("${file.upload.dir:./uploads}")
    private String uploadDir;

    @Override
    public String save(MultipartFile file) throws IOException {
        Path dir = Paths.get(uploadDir).toAbsolutePath().normalize();
        Files.createDirectories(dir);
        String filename = UUID.randomUUID() + "_" +
                file.getOriginalFilename().replaceAll("[^a-zA-Z0-9._-]", "_");
        Path dest = dir.resolve(filename).normalize();
        if (!dest.startsWith(dir)) {
            throw new BusinessException("Invalid file path");
        }
        Files.copy(file.getInputStream(), dest, StandardCopyOption.REPLACE_EXISTING);
        log.debug("Saved file locally: {}", dest);
        return dest.toString();
    }

    @Override
    public Resource load(String fileRef) throws IOException {
        Path uploadRoot = Paths.get(uploadDir).toAbsolutePath().normalize();
        Path filePath = Paths.get(fileRef).toAbsolutePath().normalize();
        if (!filePath.startsWith(uploadRoot)) {
            throw new BusinessException("Access denied");
        }
        java.io.File file = filePath.toFile();
        if (!file.exists()) {
            throw new ResourceNotFoundException("File not found on server");
        }
        return new FileSystemResource(file);
    }
}
