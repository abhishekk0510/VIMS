package com.vims.service.storage;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.URL;
import java.util.Map;
import java.util.UUID;

@Service
@ConditionalOnProperty(name = "file.storage.type", havingValue = "cloudinary")
@RequiredArgsConstructor
@Slf4j
public class CloudinaryStorageService implements StorageService {

    private final Cloudinary cloudinary;

    @Override
    @SuppressWarnings("unchecked")
    public String save(MultipartFile file) throws IOException {
        String publicId = "vims/" + UUID.randomUUID() + "_" +
                file.getOriginalFilename().replaceAll("[^a-zA-Z0-9._-]", "_");
        Map<String, Object> result = cloudinary.uploader().upload(
                file.getBytes(),
                ObjectUtils.asMap(
                        "public_id", publicId,
                        "resource_type", "raw"
                )
        );
        String secureUrl = result.get("secure_url").toString();
        log.info("Uploaded to Cloudinary: {}", secureUrl);
        return secureUrl;
    }

    @Override
    public Resource load(String fileRef) throws IOException {
        return new UrlResource(new URL(fileRef));
    }
}
